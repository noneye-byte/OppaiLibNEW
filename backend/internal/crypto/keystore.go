package crypto

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// Keystore persists the KDF salt and a verifier so the passphrase can be
// checked on subsequent boots without ever storing the passphrase or KEK.
// The KEK itself lives only in memory.
type Keystore struct {
	path string
	kek  []byte
}

type keystoreFile struct {
	Version  int    `json:"version"`
	Salt     string `json:"salt"`     // base64
	Verifier string `json:"verifier"` // base64: SealBytes(kek, "oppailib-ok")
}

var (
	ErrNoKeystore   = errors.New("crypto: keystore not initialized")
	ErrWrongPass    = errors.New("crypto: incorrect passphrase")
	verifierPlain   = []byte("oppailib-ok")
	verifierAAD     = []byte("verifier")
)

// OpenKeystore loads an existing keystore at dir/keystore.json and verifies the
// passphrase, or initializes a new one if none exists. Returns the ready KEK.
func OpenKeystore(dir, passphrase string) (*Keystore, error) {
	path := filepath.Join(dir, "keystore.json")
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return initKeystore(path, passphrase)
	}
	if err != nil {
		return nil, err
	}
	var kf keystoreFile
	if err := json.Unmarshal(data, &kf); err != nil {
		return nil, err
	}
	salt, err := base64.StdEncoding.DecodeString(kf.Salt)
	if err != nil {
		return nil, err
	}
	verifier, err := base64.StdEncoding.DecodeString(kf.Verifier)
	if err != nil {
		return nil, err
	}
	kek := DeriveKEK(passphrase, salt)
	got, err := OpenBytes(kek, verifier, verifierAAD)
	if err != nil || !ConstantTimeEqual(got, verifierPlain) {
		return nil, ErrWrongPass
	}
	return &Keystore{path: path, kek: kek}, nil
}

func initKeystore(path, passphrase string) (*Keystore, error) {
	if passphrase == "" {
		return nil, errors.New("crypto: passphrase required to initialize keystore")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}
	salt, err := RandomBytes(16)
	if err != nil {
		return nil, err
	}
	kek := DeriveKEK(passphrase, salt)
	verifier, err := SealBytes(kek, verifierPlain, verifierAAD)
	if err != nil {
		return nil, err
	}
	kf := keystoreFile{
		Version:  1,
		Salt:     base64.StdEncoding.EncodeToString(salt),
		Verifier: base64.StdEncoding.EncodeToString(verifier),
	}
	out, err := json.MarshalIndent(kf, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, out, 0o600); err != nil {
		return nil, err
	}
	return &Keystore{path: path, kek: kek}, nil
}

// KEK returns the in-memory key-encryption key.
func (k *Keystore) KEK() []byte { return k.kek }
