import jwt from 'jsonwebtoken'

const ACCESS_EXPIRES = '15m'
const REFRESH_EXPIRES = '7d'

export function signAccess(payload: object) {
  const alg = process.env.JWT_ALG || 'HS256'
  if (alg === 'RS256' && process.env.JWT_PRIVATE_KEY) {
    return jwt.sign(payload, process.env.JWT_PRIVATE_KEY, { algorithm: 'RS256', expiresIn: ACCESS_EXPIRES })
  }
  const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret'
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ACCESS_EXPIRES })
}

export function verifyAccess(token: string) {
  try {
    if ((process.env.JWT_ALG || 'HS256') === 'RS256' && process.env.JWT_PUBLIC_KEY) {
      return jwt.verify(token, process.env.JWT_PUBLIC_KEY)
    }
    const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret'
    return jwt.verify(token, secret)
  } catch (err) {
    throw err
  }
}

export function signRefresh(payload: object) {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret'
  return jwt.sign(payload, secret, { expiresIn: REFRESH_EXPIRES })
}

export function verifyRefresh(token: string) {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret'
  return jwt.verify(token, secret)
}

export default { signAccess, verifyAccess, signRefresh, verifyRefresh }
