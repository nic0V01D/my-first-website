<?php
// config.php
define('DB_HOST', 'localhost');
define('DB_NAME', 'rhema_vale');
define('DB_USER', 'usuario');
define('DB_PASS', 'senha');

// careers.php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME, DB_USER, DB_PASS);
    
    $name = $_POST['name'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $position = $_POST['position'];
    $message = $_POST['message'];
    $ip = $_SERVER['REMOTE_ADDR'];
    
    // Verificar spam
    $stmt = $pdo->prepare("SELECT * FROM applications 
                          WHERE (email = ? OR ip = ?) 
                          AND created_at > DATE_SUB(NOW(), INTERVAL 10 DAY)");
    $stmt->execute([$email, $ip]);
    
    if ($stmt->rowCount() > 0) {
        http_response_code(429);
        echo json_encode(['error' => 'Você já enviou um currículo recentemente. Tente novamente após 10 dias.']);
        exit;
    }
    
    // Processar arquivo
    $resume = $_FILES['resume'];
    $fileName = time() . '_' . basename($resume['name']);
    $targetPath = "uploads/" . $fileName;
    
    move_uploaded_file($resume['tmp_name'], $targetPath);
    
    // Inserir no banco
    $stmt = $pdo->prepare("INSERT INTO applications 
                          (name, email, phone, position, message, resume_path, ip) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $phone, $position, $message, $fileName, $ip]);
    
    echo json_encode(['success' => true]);
    exit;
}