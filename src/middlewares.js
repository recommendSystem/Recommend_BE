export const localMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteName = "E.A.T";
  res.locals.loggedInUser = req.session.user || {};
  next();
};
