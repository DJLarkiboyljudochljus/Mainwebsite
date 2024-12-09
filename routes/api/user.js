const router = require("express").Router();
const User = require("../../models/User");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const auth = require("../../middleware/auth");

// Multer configuration for file uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/img/uploads/uimg");
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + "-" + file.originalname);
	},
});

const upload = multer({ storage: storage });

router.post(
	"/edit/:id",
	auth.auth(["admin", "worker", "customer"]),
	upload.single("image"),
	async (req, res) => {
		console.log("Request body: ", req.body);
		console.log("Request file: ", req.file);

		// Fetch the user by the provided ID
		const user = await User.findById(req.params.id);

		// Validate the incoming data
		if (!user) return res.status(404).json({ message: "User not found" });

		const notUpdatedUser = user;

		// Update the user's data
		user.name = req.body.name || notUpdatedUser.name;
		user.email.email = req.body.email || notUpdatedUser.email.email;
		user.phone.phone = req.body.phone || notUpdatedUser.phone.phone;

		if (req.file) {
			// If a new file is uploaded, update the image path
			const oldImage = user.image;
			user.image = "/img/uploads/uimg/" + req.file.filename;

			// Delete the old image if it exists
			if (oldImage) {
				const oldImagePath = path.join(__dirname, "../../public", oldImage);
				fs.unlink(oldImagePath, (err) => {
					if (err) console.error(`Error deleting old image: ${err}`);
				});
			}
		}

		// Save the updated user
		try {
			await user.save();
			res.status(200).redirect("/user/profile");
		} catch (error) {
			console.error("Error saving user:", error);
			res
				.status(500)
				.json({ message: "Error updating user", error: error.message });
		}
	}
);

module.exports = router;
