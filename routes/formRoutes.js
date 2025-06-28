import express from "express";
import { submitForm, getResponses, deleteResponse, deleteUser, updateResponse } from "../controllers/formController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/submit", upload.any(), submitForm); // Handle FormData
router.get("/responses", getResponses);
router.delete("/response/:id", deleteResponse);
router.delete("/user/:id", deleteUser);
router.put("/response/:id", updateResponse);

export default router;