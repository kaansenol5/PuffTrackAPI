class SocketRateLimiter {
  constructor(windowMs, max) {
    this.windowMs = windowMs;
    this.max = max;
    this.clients = new Map();
  }

  allowRequest(clientId) {
    const now = Date.now();
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    const client = this.clients.get(clientId);
    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + this.windowMs;
      return true;
    }

    if (client.count < this.max) {
      client.count++;
      return true;
    }

    return false;
  }
}

module.exports = SocketRateLimiter;
