import { motion } from "framer-motion";

const pageVariants = {
  initial: {
    x: ["100vw", "10vw", "0vw"], // Lean in
    opacity: [0, 0.5, 1],
  },
  in: {
    x: ["10vw", "0vw"],
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 70, damping: 15 },
      opacity: { duration: 0.2 },
    },
  },
  out: {
    x: ["0vw", "-5vw", "100vw"], // Lean back then shoot
    opacity: [1, 1, 0],
    transition: {
      x: { times: [0, 0.2, 1], duration: 0.6, ease: "easeInOut" },
      opacity: { duration: 0.3, delay: 0.3 },
    },
  },
};

export default function AnimatedRoute({ children }) {
  return (
    <motion.div
      style={{ transformOrigin: "center" }}
      initial="initial"
      exit="out"
      variants={pageVariants}
      className="animated-route"
      animate="in"
    >
      {children}
    </motion.div>
  );
}
