package utils

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
)

func Craete_key() {
	// 目标目录：./data/hefeng-key
	keyDir := filepath.Join("pkg/data", "hefeng-key")

	// 确保目录存在
	err := os.MkdirAll(keyDir, 0755)
	if err != nil {
		panic(err)
	}

	// 生成 ED25519 密钥对
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		panic(err)
	}

	// ===== 私钥（PKCS8）=====
	privBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		panic(err)
	}
	privPem := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privBytes,
	}
	privPath := filepath.Join(keyDir, "ed25519-private.pem")
	err = os.WriteFile(privPath, pem.EncodeToMemory(privPem), 0600)
	if err != nil {
		panic(err)
	}

	// ===== 公钥（X.509）=====
	pubBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		panic(err)
	}
	pubPem := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	}
	pubPath := filepath.Join(keyDir, "ed25519-public.pem")
	err = os.WriteFile(pubPath, pem.EncodeToMemory(pubPem), 0644)
	if err != nil {
		panic(err)
	}

	println("ED25519 key pair generated at:", keyDir)
}
