<?php
// ======= CONFIG =======
$DEST_EMAIL = "tuamail@tuodominio.it"; // <-- cambia con la tua mail
$CSV_FILE = __DIR__ . "/ordini.csv";

// ======= HELPERS =======
function clean($v) {
  return trim(str_replace(["\r","\n"], " ", $v ?? ""));
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo "Metodo non consentito.";
  exit;
}

$nome      = clean($_POST["nome"] ?? "");
$cognome   = clean($_POST["cognome"] ?? "");
$email     = clean($_POST["email"] ?? "");
$telefono  = clean($_POST["telefono"] ?? "");
$quantita  = clean($_POST["quantita"] ?? "1");
$firma     = clean($_POST["firma"] ?? "no");
$indirizzo = clean($_POST["indirizzo"] ?? "");
$note      = clean($_POST["note"] ?? "");

$errors = [];
if ($nome === "") $errors[] = "Nome mancante.";
if ($cognome === "") $errors[] = "Cognome mancante.";
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Email non valida.";
if ($telefono === "") $errors[] = "Telefono mancante.";
if ($indirizzo === "") $errors[] = "Indirizzo mancante.";

if (!empty($errors)) {
  http_response_code(400);
  echo "Errore: " . implode(" ", $errors);
  exit;
}

$timestamp = date("Y-m-d H:i:s");

// ======= SAVE TO CSV =======
$header = ["data_ora","nome","cognome","email","telefono","quantita","dedica","indirizzo","note"];
$newFile = !file_exists($CSV_FILE);

$fp = fopen($CSV_FILE, "a");
if ($fp === false) {
  http_response_code(500);
  echo "Errore: impossibile salvare l'ordine.";
  exit;
}
if ($newFile) fputcsv($fp, $header);

fputcsv($fp, [$timestamp,$nome,$cognome,$email,$telefono,$quantita,$firma,$indirizzo,$note]);
fclose($fp);

// ======= EMAIL TO YOU =======
$subject = "Nuovo ordine libro dal sito ($quantita copia/e)";
$message =
"Nuovo ordine ricevuto:\n\n".
"Data/Ora: $timestamp\n".
"Nome: $nome $cognome\n".
"Email: $email\n".
"Telefono: $telefono\n".
"Quantità: $quantita\n".
"Dedica: $firma\n".
"Indirizzo: $indirizzo\n".
"Note: $note\n";

$headers = "From: ordini@".$_SERVER["HTTP_HOST"]."\r\n";
@mail($DEST_EMAIL, $subject, $message, $headers);

// ======= THANK YOU PAGE =======
?>
<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ordine inviato</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:0;background:#0b0c10;color:#f2f2f2;display:grid;place-items:center;height:100vh;padding:20px}
    .card{max-width:720px;background:#12141a;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:22px;box-shadow:0 12px 35px rgba(0,0,0,.35)}
    a{color:#d7b24a}
  </style>
</head>
<body>
  <div class="card">
    <h1>Ordine inviato ✅</h1>
    <p>Grazie <strong><?php echo htmlspecialchars($nome); ?></strong>! Abbiamo ricevuto la tua richiesta.</p>
    <p>Ti contatteremo a breve per conferma e dettagli di pagamento/spedizione.</p>
    <p><a href="ordine-libro.html">Torna alla pagina ordine</a></p>
  </div>
</body>
</html>
