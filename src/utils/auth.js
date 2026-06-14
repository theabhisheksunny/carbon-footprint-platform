import db from '../database/inMemoryDB.js';

export function authenticateUser(req, res, next) {
  try {
    const token = req.headers['x-user-token'];
    
    // Extract userId from parameters, body, or query
    let userId = req.params.userId || req.body.userId || req.query.userId;
    
    // Parse properties directly from req.originalUrl to bypass Express parameter matching lifecycle
    const urlPath = req.originalUrl.split('?')[0];

    // 1. Extract userId if present in URL (/users/ID or /user/ID)
    if (!userId) {
      const userMatch = urlPath.match(/(?:\/users?|\/user)\/([a-zA-Z0-9\-]+)/);
      if (userMatch) {
        userId = userMatch[1];
      }
    }

    // 2. Extract routineId if present in URL (/routines/ID)
    let routineId = req.params.routineId;
    if (!routineId) {
      const routineMatch = urlPath.match(/\/routines\/([a-zA-Z0-9\-]+)/);
      if (routineMatch) {
        routineId = routineMatch[1];
      }
    }

    // 3. Extract activityId if present in URL (/activities/ID)
    let activityId = req.params.activityId;
    if (!activityId) {
      const activitiesMatch = urlPath.match(/\/activities\/([a-zA-Z0-9\-]+)/);
      if (activitiesMatch) {
        const part = activitiesMatch[1];
        if (part !== 'user' && part !== 'batch' && part !== 'routines') {
          activityId = part;
        }
      }
    }

    // Strict security checks on ID formats (must be alphanumeric or hyphens only)
    const idRegex = /^[a-zA-Z0-9\-]+$/;
    if (userId && !idRegex.test(userId)) {
      return res.status(400).json({ error: 'Security validation failed: Invalid user ID format.' });
    }
    if (routineId && !idRegex.test(routineId)) {
      return res.status(400).json({ error: 'Security validation failed: Invalid routine ID format.' });
    }
    if (activityId && !idRegex.test(activityId)) {
      return res.status(400).json({ error: 'Security validation failed: Invalid activity ID format.' });
    }

    // Fallback lookups:
    // Resolve userId from activity if we have an activityId
    if (!userId && activityId) {
      const activity = db.findById('activities', activityId);
      if (activity) {
        userId = activity.userId;
      }
    }
    
    // Resolve userId from routine if we have a routineId
    if (!userId && routineId) {
      const routine = db.findById('routines', routineId);
      if (routine) {
        userId = routine.userId;
      }
    }

    // Resolve userId from batch activities body
    if (!userId && req.body.activities && req.body.activities.length > 0) {
      userId = req.body.activities[0].userId;
    }

    if (!userId) {
      return res.status(400).json({ error: 'Authentication failed: Missing userId context.' });
    }

    // Final validation check on resolved userId format
    if (!idRegex.test(userId)) {
      return res.status(400).json({ error: 'Security validation failed: Invalid resolved user ID format.' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'Authentication failed: User profile not found.' });
    }

    // Check token
    if (!token || user.token !== token) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing security token.' });
    }

    // Pass the authenticated user to the request context
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
