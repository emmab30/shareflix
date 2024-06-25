import React from 'react';
import styled from 'styled-components';
import { PRIMARY_FONT } from '../utils/fonts';

const GlowButton = styled.button`
  color: white;
  padding: 10px 40px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 2px;
  font-size: 20px;
  font-family: ${PRIMARY_FONT}, sans-serif;
  box-shadow: 0 0 5px #07a6f1, 0 0 3px #07a6f1, 0 0 1px #07a6f1, 0 0 5px #07a6f1;
  /* font-family: 'Pacifico', cursive; */
  background: transparent;

  &:hover {
    transition: all 1s;
    background: #07a6f1;
    box-shadow: 0 0 5px #07a6f1, 0 0 25px #07a6f1, 0 0 50px #07a6f1, 0 0 100px #07a6f1;
    border: 1px solid rgba(255,255,255,.2);
  }
`;

const Container = styled.div`
  
`;

const Button = ({ onClick, children }) => (
    <Container>
        <GlowButton onClick={onClick}>
            {children}
        </GlowButton>
    </Container>
);

export default Button;