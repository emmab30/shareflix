import React from 'react';
import styled, { keyframes } from 'styled-components';
import { PRIMARY_FONT } from '../utils/fonts';

const animationgradienttitle = keyframes`
    to {
        background-position: var(--bg-size) 0;
    }
`;

const Article = styled.article`
  text-align: center;
`;

const Header = styled.header`
  position: relative;
`;

const Title = styled.h1`
    font-family: '${PRIMARY_FONT}', serif;
    font-size: 40px;
    color: #fc3735;
    
    --bg-size: 400%;
    --color-one: hsl(15 90% 55%);
    --color-two: hsl(40 95% 55%);
    font-size: clamp(3rem, 25vmin, 8rem);
    background: linear-gradient(
                  90deg,
                  var(--color-one),
                  var(--color-two),
                  var(--color-one)
                ) 0 0 / var(--bg-size) 100%;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: ${animationgradienttitle} 8s infinite linear;
    margin: 0;
`;

const Container = styled.div`
  
`;

const AnimatedText = ({ children, containerStyle, textStyle }) => (
    <Container>
        <Article className="c-article" style={containerStyle}>
            <Header className="c-article__header">
                <Title className="c-article__title" style={textStyle}>
                    {children}
                    {/* {text.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                            {line}
                            <br />
                        </React.Fragment>
                    ))} */}
                </Title>
            </Header>
        </Article>
    </Container>
);

export default AnimatedText;
