import net from 'node:net'

/**
 * A minimal, deterministic SMTP server double for testing the Super Admin
 * SMTP settings page against a real (if fake) protocol endpoint, instead of
 * mocking the frontend's HTTP calls. Speaks plaintext SMTP (no STARTTLS
 * advertised) so the backend's opportunistic-TLS transport connects without
 * needing real certificates — tests exercise `encryption=none` with
 * `internal_relay_mode=true`, matching the "approved trusted internal
 * relay" case the backend explicitly allows. No external dependency: only
 * Node's built-in `net` module. See docs/testing/playwright-guide.md.
 */
export interface FakeSmtpMessage {
  from: string
  to: string[]
  data: string
}

export interface FakeSmtpAuthAttempt {
  username: string
  password: string
}

export interface FakeSmtpServerOptions {
  port: number
  /** When set, AUTH LOGIN only succeeds for this exact username/password pair. */
  validUsername?: string
  validPassword?: string
  /** When true (default), an AUTH attempt with the wrong credentials is rejected (535). */
  requireAuth?: boolean
}

type ConnState = 'idle' | 'auth-username' | 'auth-password' | 'data'

export class FakeSmtpServer {
  private server: net.Server
  public messages: FakeSmtpMessage[] = []
  public authAttempts: FakeSmtpAuthAttempt[] = []

  constructor(private readonly options: FakeSmtpServerOptions) {
    this.server = net.createServer((socket) => this.handleConnection(socket))
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(this.options.port, '127.0.0.1', () => resolve())
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()))
  }

  reset(): void {
    this.messages = []
    this.authAttempts = []
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = ''
    let state: ConnState = 'idle'
    let mailFrom = ''
    let rcptTo: string[] = []
    let dataLines: string[] = []
    let pendingUsername = ''

    socket.write('220 fake-smtp ready\r\n')

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      let idx: number
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        if (state === 'data') {
          if (line === '.') {
            this.messages.push({ from: mailFrom, to: [...rcptTo], data: dataLines.join('\n') })
            socket.write('250 Message accepted\r\n')
            state = 'idle'
          } else {
            dataLines.push(line)
          }
          continue
        }

        if (state === 'auth-username') {
          pendingUsername = Buffer.from(line, 'base64').toString('utf8')
          state = 'auth-password'
          socket.write('334 UGFzc3dvcmQ6\r\n')
          continue
        }

        if (state === 'auth-password') {
          const password = Buffer.from(line, 'base64').toString('utf8')
          this.authAttempts.push({ username: pendingUsername, password })
          const requireAuth = this.options.requireAuth ?? true
          const ok = !requireAuth || (pendingUsername === this.options.validUsername && password === this.options.validPassword)
          socket.write(ok ? '235 Authentication successful\r\n' : '535 Authentication failed\r\n')
          state = 'idle'
          continue
        }

        const upper = line.toUpperCase()
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-fake-smtp greets you\r\n250-AUTH LOGIN PLAIN\r\n250 8BITMIME\r\n')
        } else if (upper.startsWith('AUTH LOGIN')) {
          state = 'auth-username'
          socket.write('334 VXNlcm5hbWU6\r\n')
        } else if (upper.startsWith('MAIL FROM:')) {
          mailFrom = line.slice(line.indexOf(':') + 1).trim()
          rcptTo = []
          socket.write('250 OK\r\n')
        } else if (upper.startsWith('RCPT TO:')) {
          const addr = line.slice(line.indexOf(':') + 1).trim()
          // Simulate a real MTA rejecting an unroutable/invalid recipient.
          if (addr.toLowerCase().includes('invalid-recipient')) {
            socket.write('550 No such user here\r\n')
          } else {
            rcptTo.push(addr)
            socket.write('250 OK\r\n')
          }
        } else if (upper === 'DATA') {
          dataLines = []
          state = 'data'
          socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n')
        } else if (upper === 'RSET') {
          socket.write('250 OK\r\n')
        } else if (upper === 'QUIT') {
          socket.write('221 Bye\r\n')
          socket.end()
        } else {
          socket.write('250 OK\r\n')
        }
      }
    })

    socket.on('error', () => { /* client disconnected mid-command — nothing to clean up */ })
  }
}
