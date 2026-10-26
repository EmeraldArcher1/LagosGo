module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LAGOSGO_LEADS_TO;
  const from = process.env.LAGOSGO_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    return res.status(503).json({ error: "lead_intake_not_configured", message: "Pilot registration is not accepting submissions yet. Please try again later." });
  }
  const body = req.body || {};
  const type = body.type === "corporate" ? "Corporate transport enquiry" : body.type === "driver" ? "Driver / fleet pilot application" : body.type === "market" ? "Market delivery pilot enquiry" : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 180) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 160) : "";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 1800) : "";
  const organization = typeof body.organization === "string" ? body.organization.trim().slice(0, 180) : "";
  const marketRole = typeof body.marketRole === "string" ? body.marketRole.trim().slice(0, 120) : "";
  const marketZone = typeof body.marketZone === "string" ? body.marketZone.trim().slice(0, 160) : "";
  const pickupLandmark = typeof body.pickupLandmark === "string" ? body.pickupLandmark.trim().slice(0, 220) : "";
  const destinationLandmark = typeof body.destinationLandmark === "string" ? body.destinationLandmark.trim().slice(0, 220) : "";
  const goods = typeof body.goods === "string" ? body.goods.trim().slice(0, 220) : "";
  const quantity = typeof body.quantity === "string" ? body.quantity.trim().slice(0, 120) : "";
  const deliveryMode = typeof body.deliveryMode === "string" ? body.deliveryMode.trim().slice(0, 80) : "";
  if (!type || name.length < 2 || phone.length < 7 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true || (body.type === "driver" && body.vehicleStandards !== true) || (body.type === "market" && (!marketRole || !marketZone || !pickupLandmark || !destinationLandmark || !goods || !quantity || !deliveryMode))) {
    return res.status(400).json({ error: "invalid_form", message: "Check the required details and consent checkbox, then try again." });
  }
  const textBody = [
    type, "", "Name: " + name, "Phone: " + phone, "Email: " + email,
    "Operating area: " + (area || "Not supplied"),
    "Organisation / fleet / vehicle: " + (organization || "Not supplied"),
    "Vehicle standards confirmed: " + (body.type === "driver" && body.vehicleStandards === true ? "Yes, subject to inspection" : "Not applicable"),
    ...(body.type === "market" ? [
      "Market role: " + marketRole,
      "Market / pickup zone: " + marketZone,
      "Pickup landmark / stall: " + pickupLandmark,
      "Delivery area / landmark: " + destinationLandmark,
      "Goods and package size: " + goods,
      "Usual quantity / order volume: " + quantity,
      "Preferred delivery mode: " + deliveryMode
    ] : []),
    "", "Additional details:", details || "None supplied"
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: "LagosGo pilot — " + type, text: textBody })
    });
    if (!response.ok) return res.status(502).json({ error: "delivery_failed", message: "We could not send the application just now. Please try again later." });
    return res.status(201).json({ ok: true, message: "Your interest has been sent to the LagosGo pilot team." });
  } catch (_error) {
    return res.status(502).json({ error: "delivery_unavailable", message: "We could not send the application just now. Please try again later." });
  }
};
