import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { PRIMARY_FONT } from '../utils/fonts';
import { DEVELOPMENT_MODE } from '../../shared/constants';

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const DigitInput = styled.input`
    font-family: '${PRIMARY_FONT}';
    width: 40px;
    height: 40px;
    border: 0;
    outline: none;
    background: #222;
    border: 1px solid rgba(255,255,255,.1);
    padding: 5px;
    text-align: center;
    color: #FFF;
    font-weight: 800;
    font-size: 18px;
    border-radius: 5px;
    margin-bottom: 10px;
`;

const SixDigitInput = ({ onComplete }) => {
    /* const [values, setValues] = useState(Array(6).fill('')); */
    const [values, setValues] = useState(Array(6).fill(DEVELOPMENT_MODE ? '1' : ''));
    const inputRefs = useRef([]);

    useEffect(() => {
        setTimeout(() => {
            if (inputRefs.current && inputRefs.current[0]) inputRefs.current[0].focus();
        }, 3500);
    }, []);

    const handleChange = (e, index) => {
        const newValue = e.target.value;
        if (/^\d$/.test(newValue)) {
            const newValues = [...values];
            newValues[index] = newValue;
            setValues(newValues);

            if (index < 5) {
                inputRefs.current[index + 1].focus();
            }
            if (newValues.join('').length === 6) {
                onComplete(newValues.join(''));
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            if (values[index]) {
                const newValues = [...values];
                newValues[index] = '';
                setValues(newValues);
            } else if (index > 0) {
                inputRefs.current[index - 1].focus();
            }
        } else if (e.key === 'Enter') {
            onComplete(values.join(''));
        }
    };

    return (
        <InputContainer>
            {values.map((value, index) => (
                <DigitInput
                    key={index}
                    value={value}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    ref={(el) => (inputRefs.current[index] = el)}
                    maxLength={1}
                />
            ))}
        </InputContainer>
    );
};

export default SixDigitInput;
