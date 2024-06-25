import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { PRIMARY_FONT } from '../utils/fonts';

const SliderWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    justify-content: center;
    gap: 5px;
  position: relative;
  width: 100%;
  margin: 5px 0;
  background: #F8BC4C;
  z-index: 5;
  padding: 5px;
  border-radius: 5px;
`;

const StyledInput = styled.input`
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(0,0,0,.1);
  height: 6px;
  border-radius: 5px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    transition: all 0.1s ease-in;
    width: 10px;
    height: 10px;
    background: rgba(22, 22, 22, 1);
    border-radius: 5px;
    cursor: pointer;
  }

  &:active::-webkit-slider-thumb {
    background: rgba(22, 22, 22, 1);
  }
`;

const Tooltip = styled(motion.div)`
  color: #222;
  padding: 0px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 400;
  font-family: '${PRIMARY_FONT}', sans-serif;
`;

const SliderVolume = ({ volume, onChangeVolume }) => {
    const [visible, setVisible] = useState(false);

    /* useEffect(() => {
        if (volume !== null) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [volume]); */

    return (
        <SliderWrapper>
            <StyledInput
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
            />
            <Tooltip
                key={volume}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.05 }}
            >
                {volume}%
            </Tooltip>
            {/* <AnimatePresence>
                {visible && (
                    <Tooltip
                        key={volume}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 15 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.2 }}
                        style={{ left: `${volume}%`, transform: 'translateX(-50%)' }}
                    >
                        {volume}
                    </Tooltip>
                )}
            </AnimatePresence> */}
        </SliderWrapper>
    );
};

export default SliderVolume;
