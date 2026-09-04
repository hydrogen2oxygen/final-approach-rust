<?php

declare(strict_types=1);

const PUSH_SUBSCRIPTIONS_FILE = __DIR__ . '/.push-subscriptions.php';
const PUSH_VAPID_FILE = __DIR__ . '/.push-vapid.php';
const PUSH_EVENTS_FILE = __DIR__ . '/.push-events.php';

function pushBase64UrlEncode(string $value): string
{
  return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function pushBase64UrlDecode(string $value): string|false
{
  $padding = (4 - strlen($value) % 4) % 4;
  return base64_decode(strtr($value . str_repeat('=', $padding), '-_', '+/'), true);
}

function pushReadPhpDataFile(string $path): array
{
  if (!is_file($path)) {
    return [];
  }

  $data = include $path;
  return is_array($data) ? $data : [];
}

function pushWritePhpDataFile(string $path, array $data): void
{
  $temporaryPath = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
  $content = "<?php\nreturn " . var_export($data, true) . ";\n";

  if (file_put_contents($temporaryPath, $content, LOCK_EX) === false) {
    throw new RuntimeException('Push data could not be stored.');
  }

  @chmod($temporaryPath, 0600);

  if (!rename($temporaryPath, $path)) {
    @unlink($temporaryPath);
    throw new RuntimeException('Push data could not be activated.');
  }
}

function pushLoadVapidKeys(): array
{
  $keys = pushReadPhpDataFile(PUSH_VAPID_FILE);

  if (isset($keys['privateKey'], $keys['publicKey'])) {
    return $keys;
  }

  $privateKey = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name' => 'prime256v1'
  ]);

  if ($privateKey === false) {
    throw new RuntimeException('VAPID key generation failed.');
  }

  if (!openssl_pkey_export($privateKey, $privateKeyPem)) {
    throw new RuntimeException('VAPID private key export failed.');
  }

  $details = openssl_pkey_get_details($privateKey);

  if (!isset($details['ec']['x'], $details['ec']['y'])) {
    throw new RuntimeException('VAPID public key export failed.');
  }

  $keys = [
    'privateKey' => $privateKeyPem,
    'publicKey' => pushBase64UrlEncode("\x04" . $details['ec']['x'] . $details['ec']['y'])
  ];
  pushWritePhpDataFile(PUSH_VAPID_FILE, $keys);
  return $keys;
}

function pushLoadSubscriptions(): array
{
  return pushReadPhpDataFile(PUSH_SUBSCRIPTIONS_FILE);
}

function pushSaveSubscription(string $overviewId, array $subscription): void
{
  $endpoint = $subscription['endpoint'] ?? '';
  $p256dh = $subscription['keys']['p256dh'] ?? '';
  $auth = $subscription['keys']['auth'] ?? '';

  $decodedPublicKey = pushBase64UrlDecode($p256dh);
  $decodedAuthSecret = pushBase64UrlDecode($auth);

  if (!pushIsAllowedEndpoint($endpoint)
    || $decodedPublicKey === false || strlen($decodedPublicKey) !== 65
    || $decodedAuthSecret === false || strlen($decodedAuthSecret) !== 16) {
    throw new InvalidArgumentException('Invalid push subscription.');
  }

  $subscriptions = array_values(array_filter(
    pushLoadSubscriptions(),
    static fn(array $item): bool => ($item['endpoint'] ?? '') !== $endpoint
  ));
  $subscriptions[] = [
    'overviewId' => $overviewId,
    'endpoint' => $endpoint,
    'p256dh' => $p256dh,
    'auth' => $auth,
    'createdAt' => gmdate(DATE_ATOM)
  ];
  pushWritePhpDataFile(PUSH_SUBSCRIPTIONS_FILE, $subscriptions);
}

function pushRemoveSubscription(string $endpoint): void
{
  $subscriptions = array_values(array_filter(
    pushLoadSubscriptions(),
    static fn(array $item): bool => ($item['endpoint'] ?? '') !== $endpoint
  ));
  pushWritePhpDataFile(PUSH_SUBSCRIPTIONS_FILE, $subscriptions);
}

function pushIsAllowedEndpoint(string $endpoint): bool
{
  $parts = parse_url($endpoint);
  $host = strtolower($parts['host'] ?? '');
  $allowedHosts = [
    'fcm.googleapis.com',
    'updates.push.services.mozilla.com',
    'web.push.apple.com',
    'notify.windows.com'
  ];

  if (($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass'])) {
    return false;
  }

  foreach ($allowedHosts as $allowedHost) {
    if ($host === $allowedHost || str_ends_with($host, '.' . $allowedHost)) {
      return true;
    }
  }

  return false;
}

function pushSendToOverview(string $overviewId, array $notification): array
{
  $eventId = $notification['eventId'];
  $events = pushReadPhpDataFile(PUSH_EVENTS_FILE);
  $expiration = time() - 60 * 60 * 24 * 400;
  $events = array_filter($events, static fn(int $timestamp): bool => $timestamp >= $expiration);

  if (isset($events[$eventId])) {
    return ['delivered' => 0, 'expired' => 0, 'skipped' => true];
  }

  $subscriptions = pushLoadSubscriptions();
  $remainingSubscriptions = [];
  $delivered = 0;
  $expired = 0;
  $matched = 0;

  foreach ($subscriptions as $subscription) {
    if (($subscription['overviewId'] ?? '') !== $overviewId) {
      $remainingSubscriptions[] = $subscription;
      continue;
    }

    $matched++;

    $status = pushSend($subscription, $notification);

    if ($status >= 200 && $status < 300) {
      $delivered++;
      $remainingSubscriptions[] = $subscription;
    } elseif ($status === 404 || $status === 410) {
      $expired++;
    } else {
      $remainingSubscriptions[] = $subscription;
    }
  }

  pushWritePhpDataFile(PUSH_SUBSCRIPTIONS_FILE, $remainingSubscriptions);
  if ($matched > 0) {
    $events[$eventId] = time();
    pushWritePhpDataFile(PUSH_EVENTS_FILE, $events);
  }

  return ['delivered' => $delivered, 'expired' => $expired, 'skipped' => false];
}

function pushSend(array $subscription, array $notification): int
{
  $endpoint = $subscription['endpoint'];

  if (!pushIsAllowedEndpoint($endpoint)) {
    return 410;
  }

  $payload = json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  if ($payload === false || strlen($payload) > 3000) {
    throw new RuntimeException('Push payload is invalid or too large.');
  }

  [$body] = pushEncryptPayload(
    $payload,
    $subscription['p256dh'],
    $subscription['auth']
  );
  $vapid = pushCreateVapidAuthorization($endpoint);
  $curl = curl_init($endpoint);

  if ($curl === false) {
    throw new RuntimeException('Push request could not be initialized.');
  }

  curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => [
      'Authorization: vapid t=' . $vapid['token'] . ', k=' . $vapid['publicKey'],
      'Content-Encoding: aes128gcm',
      'Content-Type: application/octet-stream',
      'TTL: 86400'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS
  ]);
  curl_exec($curl);
  $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
  curl_close($curl);
  return $status;
}

function pushEncryptPayload(string $payload, string $clientPublicKeyEncoded, string $authSecretEncoded): array
{
  $clientPublicKey = pushBase64UrlDecode($clientPublicKeyEncoded);
  $authSecret = pushBase64UrlDecode($authSecretEncoded);

  if ($clientPublicKey === false || strlen($clientPublicKey) !== 65 || $authSecret === false) {
    throw new InvalidArgumentException('Invalid subscription encryption keys.');
  }

  $clientKeyDer = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $clientPublicKey;
  $clientKeyPem = "-----BEGIN PUBLIC KEY-----\n"
    . chunk_split(base64_encode($clientKeyDer), 64, "\n")
    . "-----END PUBLIC KEY-----\n";
  $clientKey = openssl_pkey_get_public($clientKeyPem);
  $serverKey = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name' => 'prime256v1'
  ]);

  if ($clientKey === false || $serverKey === false) {
    throw new RuntimeException('Push encryption key initialization failed.');
  }

  $sharedSecret = openssl_pkey_derive($clientKey, $serverKey, 32);
  $serverDetails = openssl_pkey_get_details($serverKey);

  if ($sharedSecret === false || !isset($serverDetails['ec']['x'], $serverDetails['ec']['y'])) {
    throw new RuntimeException('Push key agreement failed.');
  }

  $serverPublicKey = "\x04" . $serverDetails['ec']['x'] . $serverDetails['ec']['y'];
  $keyInfo = "WebPush: info\x00" . $clientPublicKey . $serverPublicKey;
  $inputKeyMaterial = pushHkdf($authSecret, $sharedSecret, $keyInfo, 32);
  $salt = random_bytes(16);
  $contentEncryptionKey = pushHkdf($salt, $inputKeyMaterial, "Content-Encoding: aes128gcm\x00", 16);
  $nonce = pushHkdf($salt, $inputKeyMaterial, "Content-Encoding: nonce\x00", 12);
  $ciphertext = openssl_encrypt(
    $payload . "\x02",
    'aes-128-gcm',
    $contentEncryptionKey,
    OPENSSL_RAW_DATA,
    $nonce,
    $tag
  );

  if ($ciphertext === false) {
    throw new RuntimeException('Push payload encryption failed.');
  }

  $body = $salt . pack('N', 4096) . chr(strlen($serverPublicKey))
    . $serverPublicKey . $ciphertext . $tag;
  return [$body, $serverPublicKey];
}

function pushHkdf(string $salt, string $inputKeyMaterial, string $info, int $length): string
{
  $pseudoRandomKey = hash_hmac('sha256', $inputKeyMaterial, $salt, true);
  return substr(hash_hmac('sha256', $info . "\x01", $pseudoRandomKey, true), 0, $length);
}

function pushCreateVapidAuthorization(string $endpoint): array
{
  $keys = pushLoadVapidKeys();
  $parts = parse_url($endpoint);
  $audience = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');

  if (isset($parts['port'])) {
    $audience .= ':' . $parts['port'];
  }

  $header = pushBase64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $claims = pushBase64UrlEncode(json_encode([
    'aud' => $audience,
    'exp' => time() + 60 * 60 * 12,
    'sub' => pushApplicationServerSubject()
  ]));
  $unsignedToken = $header . '.' . $claims;
  $privateKey = openssl_pkey_get_private($keys['privateKey']);

  if ($privateKey === false || !openssl_sign($unsignedToken, $derSignature, $privateKey, OPENSSL_ALGO_SHA256)) {
    throw new RuntimeException('VAPID signature failed.');
  }

  return [
    'token' => $unsignedToken . '.' . pushBase64UrlEncode(pushDerSignatureToJose($derSignature)),
    'publicKey' => $keys['publicKey']
  ];
}

function pushApplicationServerSubject(): string
{
  $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));

  if (!preg_match('/^[a-z0-9.-]+(?::\d+)?$/', $host)) {
    throw new RuntimeException('The application host is invalid.');
  }

  return 'https://' . $host . '/';
}

function pushDerSignatureToJose(string $signature): string
{
  $offset = 0;

  if (ord($signature[$offset++]) !== 0x30) {
    throw new RuntimeException('Invalid ECDSA signature.');
  }

  pushReadDerLength($signature, $offset);

  if (ord($signature[$offset++]) !== 0x02) {
    throw new RuntimeException('Invalid ECDSA signature component.');
  }

  $rLength = pushReadDerLength($signature, $offset);
  $r = substr($signature, $offset, $rLength);
  $offset += $rLength;

  if (ord($signature[$offset++]) !== 0x02) {
    throw new RuntimeException('Invalid ECDSA signature component.');
  }

  $sLength = pushReadDerLength($signature, $offset);
  $s = substr($signature, $offset, $sLength);
  $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
  $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
  return substr($r, -32) . substr($s, -32);
}

function pushReadDerLength(string $value, int &$offset): int
{
  $length = ord($value[$offset++]);

  if (($length & 0x80) === 0) {
    return $length;
  }

  $byteCount = $length & 0x7f;
  $length = 0;

  for ($index = 0; $index < $byteCount; $index++) {
    $length = ($length << 8) | ord($value[$offset++]);
  }

  return $length;
}
