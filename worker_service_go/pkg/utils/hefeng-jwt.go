package utils

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func LoadPrivateKey() ed25519.PrivateKey {
	_, currentFile, _, _ := runtime.Caller(0)
	baseDir := filepath.Dir(currentFile) // pkg/utils

	keyPath := filepath.Join(
		baseDir,
		"..",
		"data",
		"hefeng-key",
		"ed25519-private.pem",
	)
	keyPath = filepath.Clean(keyPath)

	data, err := os.ReadFile(keyPath)
	if err != nil {
		panic(err)
	}

	block, _ := pem.Decode(data)
	if block == nil {
		panic("invalid private key pem")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		panic(err)
	}

	return key.(ed25519.PrivateKey)
}

func GenerateHefengJWT(projectID, keyID string) (string, error) {
	privateKey := LoadPrivateKey()

	claims := jwt.MapClaims{
		"sub": projectID,
		"iat": time.Now().Add(-30 * time.Second).Unix(),
		"exp": time.Now().Add(1 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	token.Header["kid"] = keyID

	return token.SignedString(privateKey)
}
