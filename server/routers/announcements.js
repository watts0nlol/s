import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    {
      course: "CPAN 212",
      message: "Assignment 4 due Friday"
    },
    {
      course: "CPAN 211",
      message: "Lab submission tonight"
    },
    {
      course: "Web Dev",
      message: "Group presentation next week"
    }
  ]);
});

export default router;
