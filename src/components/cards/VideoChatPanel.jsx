import { Box, Flex, Text, Button } from "@chakra-ui/react";
import { useEffect, useRef, useState, useReducer } from "react";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";
import VideoPlayer from './VideoPlayer';
import socket from '../../config/socketConfig'
import { useParams } from 'react-router-dom';

const VideoChatPanel = (props) => {
    const params = useParams();
    const localStreamRef = useRef();
    const localStreamParentRef = useRef();
    const [localStream, setLocalStream] = useState(null);
    const [localStreamWidth, setLocalStreamWidth] = useState(1.7777777777777777);
    const [localStreamHeight, setLocalStreamHeight] = useState(1);
    const [defaultVideoOptions, setDefaultVideoOptions] = useState({
        video: {
            aspectRatio: localStreamWidth / localStreamHeight,
        },
        audio: true
    })
    const peerRef = useRef(null);
    const [micStatus, setMicStatus] = useState(false);
    const [camStatus, setCamStatus] = useState(true);
    const [joinStatus, setJoinStatus] = useState(false);
    const micOnOffHandler = (e) => {
        e.preventDefault();
        setMicStatus(prev => !prev);
    }
    const camOnOffHandler = (e) => {
        e.preventDefault();
        setCamStatus(prev => !prev);
    }

    const joinStatusHandler = (e) => {
        setJoinStatus(true);
    }

    // listen to changes in resize
    useEffect(() => {
        localStreamParentRef.current.style.position = 'relative';
        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            // console.log("Resized:", width, height);
            // do something on resize
            setLocalStreamWidth(width);
            setLocalStreamHeight(height);
        });

        resizeObserver?.observe(localStreamParentRef.current);

        return () => {
            resizeObserver?.disconnect(localStreamParentRef.current);
        };

    }, []);

    // listen to changes in mic/cam status
    useEffect(() => {
        setDefaultVideoOptions({
            video: camStatus ?
                { aspectRatio: parseFloat(localStreamWidth / localStreamHeight).toFixed(6) }
                : false,
            audio: micStatus,
        })

        return () => {
            console.log('CLEANUP!!! from mic/cam listening changes');
            if (!camStatus) {
                localStream?.getVideoTracks()?.forEach(track => track.stop());
            }
            if (!micStatus) {
                localStream?.getAudioTracks()?.forEach(track => track.stop());
            }
        }
    }, [micStatus, camStatus, localStreamWidth, localStreamHeight])

    // get the stream with a custom aspect ratio
    useEffect(() => {

        const getStream = async () => {
            if (!micStatus && !camStatus) return setLocalStream(null);

            // get the stream
            const localMediaStream = await navigator.mediaDevices.getUserMedia(defaultVideoOptions)
            // video.src = URL.createObjectURL(mediaStream);
            // console.log(localMediaStream);
            setLocalStream(localMediaStream);
        }
        getStream();
        return () => {
            console.log('CLEANUP!!! from getStream');
            setLocalStream(null);
        }
    }, [defaultVideoOptions, defaultVideoOptions.video, defaultVideoOptions.audio]);

    // set the stream to user
    useEffect(() => {
        if (localStream && localStreamRef.current) {
            localStreamRef.current.srcObject = localStream;
            localStreamRef.current.style.transform = 'scaleX(-1)';
            if (socket.connected) {
                socket.emit("update-stream", params.meetcode, peer._id);
            }
        }
        return () => {
            console.log('CLEANUP!!! from setStream');
            localStream?.getTracks()?.forEach(track => track.stop());
        }
    }, [localStream]);

    useEffect(() => {
        // console.log('localStream not activated');
        if (localStream != null && joinStatus) {
            // console.log('localStream activated');
            socket.connect();
        }

        return () => {
            // socket?.disconnect();
        }
    }, [localStream, joinStatus])

    // useEffect to set up socket connection
    useEffect(() => {

        socket.on('connect', () => {
            // console.log(socket.id);

            // emit join-meet event (joins a meet room)
            socket.emit('join-meet', params.meetcode, peer._id);

        })

        socket.on('joined-meet', (peerId) => {
            console.log("joined-meet: ", peerId);
        })

        // when i join as a user, i fetch the user list and call them
        socket.on('get-users', (meetUsersList) => {
            console.log(meetUsersList);
            const filteredList = meetUsersList.filter(id => id != peer._id);
            console.log(filteredList);
        })

        socket.on('message', (data) => {
            console.log(data);
        })


        // on some other user disconnect, remove that user
        socket.on('user-disconnected', (peerId) => {
            console.log('user-disconnected: ', peerId);
        })



        return () => {
            console.log('CLEANUP!!! from socket connnect')
            // peer.disconnect();
        }
    }, [localStream])


    return (
        <Box>
            <Flex
                w={{
                    base: '450px',
                    md: '75vw'
                }}
                h={{
                    base: '400px',
                    md: '65vh'
                }}
                border={'2px'}
                borderRadius={'md'}
                borderColor='gray.400'
                background={'blackAlpha.400'}
                direction={'column'}
                alignItems={'center'}
            >
                <Flex direction={'row'} w={'full'}>

                    <Flex
                        w={{
                            base: 'full',
                            md: '60vw'
                        }}
                        h={{
                            base: '250px',
                            md: '50vh'
                        }}
                        justifyContent={'space-around'}
                        border={'1px'}
                        boxShadow="inset 0px 0px 50px rgba(0, 0, 0, 0.5)"
                        ref={localStreamParentRef}
                    >
                        <video
                            ref={localStreamRef} autoPlay={true} muted={true} >
                        </video>
                        <button
                            style={{
                                position: 'absolute',
                                zIndex: 100,
                                bottom: '2%',
                                left: '40%',
                                background: "white",
                                borderRadius: '30%',
                            }}
                            onClick={micOnOffHandler}
                        >
                            {
                                micStatus ? <MdMic size={30} /> : <MdMicOff size={30} />
                            }
                        </button>
                        <button
                            style={{
                                position: 'absolute',
                                zIndex: 100,
                                bottom: '2%',
                                left: '60%',
                                background: "white",
                                borderRadius: '30%',
                            }}
                            onClick={camOnOffHandler}
                        >
                            {
                                camStatus ? <MdVideocam size={30} /> : <MdVideocamOff size={30} />
                            }
                        </button>


                    </Flex>
                    <Box
                        display={{
                            base: 'none',
                            md: 'flex'
                        }}
                        w={{
                            md: '15vw'
                        }}
                        h={{
                            base: '250px',
                            md: '50vh'
                        }}
                        border={'1px'}>
                // extra options
                    </Box>
                </Flex>
                <Flex
                    p='2px'
                    direction='col'
                    h={'full'}
                    gap={'10px'}
                >
                    {
                            <p>No users to display</p>
                    }
                </Flex>
            </Flex>
            <Button onClick={joinStatusHandler} isDisabled={!localStream}>JOIN CALL</Button>
        </Box>
    )
}

export default VideoChatPanel;