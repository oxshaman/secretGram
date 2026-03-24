# P2Chat

End-to-end encrypted messaging over Telegram. Messages are encrypted in your browser before being sent — Telegram only ever sees ciphertext.

---

## Run it on macOS

### 1. Install Node.js (if you don't have it)

Check if you already have it:

```bash
node -v
```

If that prints `v18` or higher, skip ahead. Otherwise:

**Option A — Homebrew (recommended):**

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

**Option B — Direct download:**

Go to https://nodejs.org and download the macOS installer. Run it, click through, done.

Verify it worked:

```bash
node -v   # should print v18 or higher
npm -v    # should print a version number
```

### 2. Get Telegram API credentials

1. Go to https://my.telegram.org and log in with your phone number
2. Click **API development tools**
3. Fill in any app name/short name (doesn't matter what)
4. Copy your **api_id** (a number) and **api_hash** (a hex string)

### 3. Set up the project

```bash
cd p2chat
npm install
```

Create your config file:

```bash
cp .env.example .env
```

Open `.env` in any text editor and paste in your credentials. Ask Mislav for credentials.


### 4. Run it

```bash
npm run dev
```

Open http://localhost:5173 in your browser. You'll be prompted to log in with your Telegram phone number and verification code.

### 5. Exchange keys with someone

P2Chat adds its own encryption layer on top of Telegram. Both you and your contact need to do this:

1. Click the **key icon** in the sidebar — your keypair is generated automatically
2. **Copy your public key** and send it to your contact (via regular Telegram, email, etc.)
3. In the **Contacts** tab, paste their public key + their numeric Telegram user ID
4. Once both sides have each other's keys, messages encrypt/decrypt automatically

To find someone's Telegram user ID: open their chat info in P2Chat, or have them message `@userinfobot` on Telegram.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `command not found: node` | Install Node.js (step 1) |
| `command not found: npm` | Comes with Node.js — reinstall Node |
| `npm install` fails with permission errors | Don't use `sudo`. If Homebrew-installed, run `brew doctor` |
| Port 5173 already in use | Kill the other process or set `VITE_PORT` in `.env` |
| TDLib crashes on Apple Silicon | Run `npm rebuild` — the prebuilt binary should auto-select the right arch |
| Telegram login code not arriving | Wait 30s, try again. Make sure the phone number includes country code (e.g. `+1...`) |

## How it works

```
You type plaintext ➜ Browser encrypts with recipient's public key
                     ➜ Ciphertext sent as a normal Telegram message
                     ➜ Recipient's browser decrypts with their private key
                     ➜ They see plaintext
```

- **Encryption**: NaCl box (Curve25519 + XSalsa20-Poly1305) via [tweetnacl](https://www.npmjs.com/package/tweetnacl)
- **Private keys never leave your browser** (stored in IndexedDB)
- **Message format**: `p2p:v1:<nonce_base64>:<ciphertext_base64>`
- Text messages in 1-to-1 chats only (no group chats, no media encryption)
