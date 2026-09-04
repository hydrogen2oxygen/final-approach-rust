<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$apiKey = 'CHANGE_ME_SECRET_KEY';

$givenKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

if (!hash_equals($apiKey, $givenKey)) {
  jsonResponse(['error' => 'Unauthorized'], 401);
}

$dataDir = __DIR__ . '/assets/data';

/**
 * Ordner sicherstellen
 */
if (!is_dir($dataDir)) {
  mkdir($dataDir, 0775, true);
}

/**
 * Antwort senden
 */
function jsonResponse(mixed $data, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  exit;
}

/**
 * Sicheren Dateinamen erzeugen
 */
function sanitizeName(string $name): string
{
  $name = basename($name);
  $name = preg_replace('/[^a-zA-Z0-9_\-]/', '', $name);

  if ($name === '') {
    jsonResponse(['error' => 'Ungültiger Dateiname'], 400);
  }

  if (!str_ends_with($name, '.json')) {
    $name .= '.json';
  }

  return $name;
}

/**
 * Pfad zur JSON-Datei
 */
function getJsonFilePath(string $dataDir, string $name): string
{
  $filename = sanitizeName($name);
  return $dataDir . DIRECTORY_SEPARATOR . $filename;
}


/**
 * Sicheren relativen Pfad für UI-Dateien erzeugen
 */
function sanitizeUiPath(string $name): string
{
  $name = str_replace('\\', '/', trim($name));

  if ($name === '' || str_starts_with($name, '/') || str_contains($name, '..')) {
    jsonResponse(['error' => 'Ungültiger UI-Dateipfad'], 400);
  }

  if (!preg_match('#^[a-zA-Z0-9._/\\-]+$#', $name)) {
    jsonResponse(['error' => 'Ungültiger UI-Dateipfad'], 400);
  }

  return $name;
}

/**
 * JSON Body lesen
 */
function readJsonBody(): array
{
  $raw = file_get_contents('php://input');

  if ($raw === false || trim($raw) === '') {
    jsonResponse(['error' => 'Leerer Request Body'], 400);
  }

  $json = json_decode($raw, true);

  if (json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse([
      'error' => 'Ungültiges JSON',
      'details' => json_last_error_msg()
    ], 400);
  }

  return $json;
}

$method = $_SERVER['REQUEST_METHOD'];
$name = $_GET['name'] ?? null;
$action = $_GET['action'] ?? null;

if ($action === 'ping') {
  jsonResponse(['status' => 'ok']);
}

if ($action === 'notify') {
  if ($method !== 'POST') {
    jsonResponse(['error' => 'Methode nicht erlaubt'], 405);
  }

  $notification = readJsonBody();
  $overviewId = (string)($notification['overviewId'] ?? '');
  $eventId = (string)($notification['eventId'] ?? '');
  $title = trim((string)($notification['title'] ?? ''));
  $body = trim((string)($notification['body'] ?? ''));
  $url = (string)($notification['url'] ?? '');

  if (!preg_match('/^-?\d+$/', $overviewId)
    || !preg_match('/^[a-zA-Z0-9:_\-.]{8,200}$/', $eventId)
    || $title === '' || strlen($title) > 200
    || $body === '' || strlen($body) > 1000
    || !preg_match('/^\.\/\?id=-?\d+$/', $url)) {
    jsonResponse(['error' => 'Ungültige Push-Nachricht'], 400);
  }

  if (!is_file(__DIR__ . '/assets/data/' . $overviewId . '.json')) {
    jsonResponse(['error' => 'Gebietsübersicht nicht gefunden'], 404);
  }

  $pushSupportPath = __DIR__ . '/push-support.php';

  if (!is_file($pushSupportPath)) {
    jsonResponse(['error' => 'Push-Unterstützung wurde noch nicht hochgeladen'], 503);
  }

  try {
    require_once $pushSupportPath;
    jsonResponse(pushSendToOverview($overviewId, [
      'eventId' => $eventId,
      'title' => $title,
      'body' => $body,
      'url' => $url
    ]));
  } catch (Throwable $error) {
    error_log('Push notification failed: ' . $error->getMessage());
    jsonResponse(['error' => 'Push-Nachricht konnte nicht gesendet werden'], 502);
  }
}

switch ($method) {

  case 'GET':
    if ($name === null || trim($name) === '') {
      $files = glob($dataDir . DIRECTORY_SEPARATOR . '*.json');

      $result = array_map(
        fn($file) => basename($file),
        $files ?: []
      );

      jsonResponse($result);
    }

    $filePath = getJsonFilePath($dataDir, $name);

    if (!file_exists($filePath)) {
      jsonResponse(['error' => 'Datei nicht gefunden'], 404);
    }

    $content = file_get_contents($filePath);

    if ($content === false) {
      jsonResponse(['error' => 'Datei konnte nicht gelesen werden'], 500);
    }

    $json = json_decode($content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
      jsonResponse([
        'error' => 'Datei enthält ungültiges JSON',
        'details' => json_last_error_msg()
      ], 500);
    }

    jsonResponse($json);
    break;


  case 'POST':
    if ($action === 'upload-ui') {
      if ($name === null || trim($name) === '') {
        jsonResponse(['error' => 'Parameter "name" fehlt'], 400);
      }

      $relativePath = sanitizeUiPath($name);
      $uiDir = __DIR__ . '/';
      $filePath = $uiDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
      $targetDir = dirname($filePath);

      if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        jsonResponse(['error' => 'Zielordner konnte nicht erstellt werden'], 500);
      }

      $raw = file_get_contents('php://input');

      if ($raw === false) {
        jsonResponse(['error' => 'Request Body konnte nicht gelesen werden'], 400);
      }

      if (file_put_contents($filePath, $raw) === false) {
        jsonResponse(['error' => 'UI-Datei konnte nicht gespeichert werden'], 500);
      }

      jsonResponse([
        'message' => 'UI-Datei gespeichert',
        'file' => $relativePath
      ], 201);
    }

    if ($name === null || trim($name) === '') {
      jsonResponse(['error' => 'Parameter "name" fehlt'], 400);
    }

    $filePath = getJsonFilePath($dataDir, $name);

    if (file_exists($filePath)) {
      jsonResponse(['error' => 'Datei existiert bereits'], 409);
    }

    $json = readJsonBody();

    $saved = file_put_contents(
      $filePath,
      json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    if ($saved === false) {
      jsonResponse(['error' => 'Datei konnte nicht gespeichert werden'], 500);
    }

    jsonResponse([
      'message' => 'Datei erstellt',
      'file' => basename($filePath)
    ], 201);
    break;


  case 'PUT':
    if ($name === null || trim($name) === '') {
      jsonResponse(['error' => 'Parameter "name" fehlt'], 400);
    }

    $filePath = getJsonFilePath($dataDir, $name);

    $fileExists = file_exists($filePath);

    $json = readJsonBody();

    $saved = file_put_contents(
      $filePath,
      json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    if ($saved === false) {
      jsonResponse(['error' => 'Datei konnte nicht geändert werden'], 500);
    }

    jsonResponse([
      'message' => $fileExists ? 'Datei geändert' : 'Datei erstellt',
      'file' => basename($filePath)
    ], $fileExists ? 200 : 201);
    break;


  case 'DELETE':
    if ($name === null || trim($name) === '') {
      jsonResponse(['error' => 'Parameter "name" fehlt'], 400);
    }

    $filePath = getJsonFilePath($dataDir, $name);

    if (!file_exists($filePath)) {
      jsonResponse(['error' => 'Datei nicht gefunden'], 404);
    }

    if (!unlink($filePath)) {
      jsonResponse(['error' => 'Datei konnte nicht gelöscht werden'], 500);
    }

    jsonResponse([
      'message' => 'Datei gelöscht',
      'file' => basename($filePath)
    ]);
    break;


  default:
    jsonResponse(['error' => 'Methode nicht erlaubt'], 405);
}
