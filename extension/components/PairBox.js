import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AnimatedText from './AnimatedText';
import SixDigitInput from './SixDigitInput';
import { PRIMARY_FONT } from '../utils/fonts';
import Button from './Button';

const StyledContainer = styled(motion.div)`
    position: fixed;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,1);
`;

const Separator = styled(motion.div)`
    width: 50%;
    margin: 0 auto;
    height: 1px;
    background: rgba(255,255,255,.1);
    margin: 20px 0;
`;

const UsersPanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 10px;
`;

const UsersContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 15px;
`;

const PairBox = ({ lobby, code, user, onJoin, onStartSession, onClose }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                when: "beforeChildren"
            }
        },
        exit: { opacity: 0, transition: { duration: 1, when: "afterChildren" } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        },
        exit: { opacity: 0, y: -20, transition: { duration: .15 } }
    };

    const isInitiator = () => {
        return lobby?.initiatorId == user?.id;
    }

    return (
        <StyledContainer
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40, gap: 10 }}>
                <motion.img
                    variants={itemVariants}
                    src="https://i.ibb.co/x7yPbF0/icon.png"
                    style={{ objectFit: 'contain', width: 65, height: 65, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    {user?.alias != null && (
                        <motion.h1 variants={itemVariants} style={{ color: 'white', fontSize: 25, fontWeight: 200, margin: 5, fontFamily: PRIMARY_FONT }}>
                            Hello, <span style={{ color: '#F8B545' }}><b>{user.alias}</b>!</span>
                        </motion.h1>

                    )}

                    <motion.h1 variants={itemVariants} style={{ color: 'white', fontSize: 25, fontWeight: 200, margin: 5, fontFamily: PRIMARY_FONT }}>
                        Welcome to <b>Shareflix</b>
                    </motion.h1>
                </div>
            </div>
            <motion.h5
                style={{ fontSize: 17, fontWeight: 400, margin: 5, fontFamily: PRIMARY_FONT }}
                variants={itemVariants}
            >
                Share the code below with your friend to start watching together
            </motion.h5>
            <motion.div variants={itemVariants}>
                <AnimatedText textStyle={{ fontWeight: 800, fontFamily: PRIMARY_FONT }}>
                    {code}
                </AnimatedText>
            </motion.div>

            {lobby && lobby.users.length > 0 && (
                <UsersPanelContainer>
                    <UsersContainer>
                        {lobby && lobby.users.map((user) => {
                            return (
                                <motion.div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: 5,
                                        minWidth: 50
                                    }}
                                    key={user.id}>
                                    <img
                                        src={'https://cdn-icons-png.flaticon.com/512/8792/8792047.png'}
                                        style={{ width: 30, objectFit: 'contain' }}
                                    />
                                    <p style={{ color: 'white', fontSize: 11, fontWeight: 200, margin: 0, fontFamily: PRIMARY_FONT, textAlign: 'center' }}>
                                        {user.alias}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </UsersContainer>

                    {lobby.users.length > 1 && isInitiator() && (
                        <Button onClick={onStartSession}>Start watching!</Button>
                    )}
                </UsersPanelContainer>
            )}

            <Separator variants={itemVariants} />
            <motion.h5
                style={{ fontSize: 16, margin: 0, fontFamily: PRIMARY_FONT }}
                variants={itemVariants}
            >
                Or ask your friend for their code and enter it below
            </motion.h5>
            <motion.div variants={itemVariants}>
                <SixDigitInput onComplete={(code) => onJoin(code)} />
            </motion.div>
        </StyledContainer>
    );
};

export default PairBox;
