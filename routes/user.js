const router = require("express").Router();
const auth = require("../middleware/auth");
const Event = require("../models/Booking");

router.get(
	"/profile",
	auth.auth(["admin", "worker", "user"]),
	async (req, res) => {
		// Fetch all the upcoming events for the authenticated user
		const upcomingEvents = await Event.find({
			customer: req.user._id,
			date: { $gt: new Date() },
		});

		// Render the view
		res.render("profile", { title: "Profile", upcomingEvents });
	}
);

router.get("/edit", async (req, res) => {
	// Render the view
	res.render("edit-profile", { title: "Edit Profile" });
});

router.get("/change-password", async (req, res) => {
	// Render the view
	res.render("change-password", { title: "Change Password" });
});

module.exports = router;
