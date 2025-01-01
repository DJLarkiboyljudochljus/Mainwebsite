const router = require("express").Router();
const User = require("../../models/User");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const auth = require("../../middleware/auth");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set",
	api_secret: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set",
});

console.log(cloudinary.config(), "Cloudinary Config");

console.log("Cloudinary Config", {
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set",
	api_secret: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set",
});

// Configure Multer to use Cloudinary
const storage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "user_uploads",
		allowed_formats: ["jpg", "png", "jpeg", "gif"],
	},
});

const upload = multer({ storage: storage });

router.post(
	"/edit/:id",
	(req, res, next) => {
		console.log("Route /api/users/edit/:id is being hit", req.body);
		next();
	},
	auth.auth(["admin", "worker", "customer"]),
	upload.single("image"),
	async (req, res) => {
		console.log("Request body: ", JSON.stringify(req.body, null, 2));
		console.log("Request file: ", JSON.stringify(req.file, null, 2));

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
			const oldImage = notUpdatedUser.image;

			user.image = req.file.path;

			if (oldImage) {
				const publicId = oldImage.split("/").pop().split(".")[0];

				try {
					await cloudinary.uploader.destroy(publicId);
				} catch (err) {
					console.error("Error deleting old image:", err);
					res.status(500).json({ message: "Error deleting old image" });
					return;
				}
			}
		}

		// Save the updated user
		try {
			await user.save();
			res.status(200).json({ message: "Successfully saved user", user });
		} catch (error) {
			console.error("Error saving user:", error);
			res.status(500).json({ message: "Error updating user", error: error.message });
		}
	}
);

module.exports = router;
