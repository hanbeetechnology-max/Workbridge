import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

// Word-by-word scroll-triggered reveal for headings/statement copy — each
// word rises and fades in with a short stagger, instead of the whole
// heading appearing as one block. Splits on spaces only (safe for plain
// text headings); pass richly-formatted children through the plain
// ScrollReveal component instead, not this one.
export default function TextReveal({
  as: Tag = "h2",
  text,
  className = "",
  wordClassName = "",
  stagger = 0.035,
  delay = 0,
  once = true,
  amount = 0.4,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount, margin: "0px 0px -10% 0px" });
  const reducedMotion = useReducedMotion();
  const words = text.split(" ");

  const MotionTag = motion[Tag] ?? motion.span;

  if (reducedMotion) {
    return (
      <MotionTag
        ref={ref}
        className={className}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {text}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      style={{ overflowWrap: "anywhere" }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className={`inline-block ${wordClassName}`.trim()}
          variants={{
            hidden: { opacity: 0, y: "0.5em", filter: "blur(4px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </MotionTag>
  );
}
