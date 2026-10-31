const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bankretain_corporate_jwt_secret_key_2026_enterprise_attrition';

/**
 * Verify JWT authentication token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If no token in development/demo, assign default demo analyst user
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: 1,
        username: 'admin',
        fullName: 'Executive Administrator',
        email: 'admin@bankretain.internal',
        role: 'admin',
      };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Role-Based Access Control middleware
 * @param {string[]} allowedRoles 
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please authenticate first.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' lacks sufficient privileges for this operation. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET,
};
