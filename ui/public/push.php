<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

require_once __DIR__ . '/push-support.php';

function pushJsonResponse(array $data, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function pushRequireSameOrigin(): void
{
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $originHost = parse_url($origin, PHP_URL_HOST);
  $originPort = parse_url($origin, PHP_URL_PORT);
  $expectedHost = strtolower($host);

  if ($originPort !== null) {
    $originHost .= ':' . $originPort;
  }

  if ($origin === '' || strtolower((string)$originHost) !== $expectedHost) {
    pushJsonResponse(['error' => 'Invalid origin'], 403);
  }
}

function pushReadRequestBody(): array
{
  $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);

  if ($contentLength > 16384) {
    pushJsonResponse(['error' => 'Request body is too large'], 413);
  }

  $body = json_decode((string)file_get_contents('php://input'), true);

  if (!is_array($body)) {
    pushJsonResponse(['error' => 'Invalid JSON body'], 400);
  }

  return $body;
}

$action = $_GET['action'] ?? '';

try {
  if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'config') {
    pushJsonResponse(['publicKey' => pushLoadVapidKeys()['publicKey']]);
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pushJsonResponse(['error' => 'Method not allowed'], 405);
  }

  pushRequireSameOrigin();
  $body = pushReadRequestBody();

  if ($action === 'subscribe') {
    $overviewId = (string)($body['overviewId'] ?? '');

    if (!preg_match('/^-?\d+$/', $overviewId)) {
      pushJsonResponse(['error' => 'Only preacher overviews can be subscribed'], 400);
    }

    $overviewPath = __DIR__ . '/assets/data/' . $overviewId . '.json';

    if (!is_file($overviewPath)) {
      pushJsonResponse(['error' => 'Territory overview not found'], 404);
    }

    $overview = json_decode((string)file_get_contents($overviewPath), true);
    $overviewIds = [$overviewId];
    $linkedGroupOverviewId = is_array($overview)
      ? (string)($overview['linkedServiceGroupOverviewId'] ?? '')
      : '';

    if ($linkedGroupOverviewId !== '') {
      $linkedGroupPath = __DIR__ . '/assets/data/' . $linkedGroupOverviewId . '.json';

      if (preg_match('/^-?\d+$/', $linkedGroupOverviewId) && is_file($linkedGroupPath)) {
        $overviewIds[] = $linkedGroupOverviewId;
      }
    }

    pushSaveSubscription(
      $overviewIds,
      is_array($body['subscription'] ?? null) ? $body['subscription'] : []
    );
    pushJsonResponse([
      'subscribed' => true,
      'overviewIds' => $overviewIds
    ]);
  }

  if ($action === 'unsubscribe') {
    $endpoint = (string)($body['endpoint'] ?? '');

    if ($endpoint === '') {
      pushJsonResponse(['error' => 'Push endpoint is missing'], 400);
    }

    pushRemoveSubscription($endpoint);
    pushJsonResponse(['subscribed' => false]);
  }

  pushJsonResponse(['error' => 'Unknown action'], 404);
} catch (InvalidArgumentException $error) {
  pushJsonResponse(['error' => $error->getMessage()], 400);
} catch (Throwable $error) {
  error_log('Push endpoint error: ' . $error->getMessage());
  pushJsonResponse(['error' => 'Push operation failed'], 500);
}
