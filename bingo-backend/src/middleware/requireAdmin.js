// Guarda de rutas /admin: exige sesion iniciada y tipo ADMIN.
function requireAdmin(req, res, next) {
  const sessionUser = req.session?.user;

  if (!sessionUser) {
    return res.status(401).json({ error: "no autenticado" });
  }
  if (sessionUser.tipo !== "ADMIN") {
    return res.status(403).json({ error: "solo admin" });
  }

  return next();
}

module.exports = requireAdmin;
