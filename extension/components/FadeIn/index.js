import React from "react";
import FadeInChild from "./FadeInChild";

export default function FadeIn(props) {
    const transitionDuration = typeof props.transitionDuration === "number" ? props.transitionDuration : 600;
    const delay = typeof props.delay === "number" ? props.delay : 0;
    const WrapperTag = props.wrapperTag || "div";

    return (
        <WrapperTag className={props.className} style={props.style} onClick={props.onClick}>
            {React.Children?.map(props.children, (child, i) => (
                <FadeInChild
                    animationType={props.animationType}
                    transitionDuration={transitionDuration}
                    delay={(delay / 1000)}
                    childClassName={props.childClassName}
                    childStyle={props.childStyle}
                    key={i}>
                    {child}
                </FadeInChild>
            ))}
        </WrapperTag>
    );
}