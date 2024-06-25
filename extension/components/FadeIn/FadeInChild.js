import { motion } from "framer-motion";
import useInView from "./useInView";
import React, { useEffect, useState } from "react";

function FadeInChild({
    children,
    childClassName,
    childStyle,
    transitionDuration,
    delay = 0,
    animationType = "fadeIn",
}) {
    const [inViewRef, inView] = useInView({
        threshold: 0.5,
    });
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        if (inView) {
            setHasAnimated(true);
        }
    }, [inView]);

    // Define animation properties based on animationType
    let initialProps = {};
    let animateProps = {};

    switch (animationType) {
        case "fadeIn":
            initialProps = { opacity: 0 };
            animateProps = { opacity: inView || hasAnimated ? 1 : 0 };
            break;

        case "slideInLeft":
            const defaultX = -10;
            initialProps = { opacity: 0, x: defaultX };
            animateProps = { opacity: inView || hasAnimated ? 1 : 0, x: inView || hasAnimated ? 0 : defaultX };
            break;

        case "slideInRight":
            const defaultX1 = 10;
            initialProps = { opacity: 0, x: defaultX1 };
            animateProps = { opacity: inView || hasAnimated ? 1 : 0, x: inView || hasAnimated ? 0 : defaultX1 };
            break;

        case "scaleIn":
            const defaultScale = 0.8;
            initialProps = { opacity: 0, scale: defaultScale };
            animateProps = { opacity: inView || hasAnimated ? 1 : 0, scale: inView || hasAnimated ? 1 : defaultScale };
            break;

        default:
            break;
    }

    { /* eslint-disable */ }
    return (
        <motion.div
            ref={inViewRef}
            initial={initialProps}
            animate={animateProps}
            transition={{ duration: transitionDuration / 1000, delay: delay }}
            className={childClassName}
            style={childStyle}>
            {children}
        </motion.div>
    );
}

export default FadeInChild;
