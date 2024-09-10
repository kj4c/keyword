'use client';

import RedButton from '@/components/keyword/redButton/RedButton';
import React from 'react';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import CategoryDropDown from '@/components/keyword/categoryDropDown/categoryDropDown';
import CyborgDropDown from '@/components/keyword/cyborgDropDown/cyborgDropDown';
import TimeDropDown from '@/components/keyword/timeDropDown/timeDropDown';
import StartButton from '@/components/keyword/startButton/startButton';
import PlayerBoard from '@/components/keyword/playerBoard/playerBoard';
import { useRouter } from "next/navigation";
import { useRef } from 'react';

const socket = io('http://localhost:4000');

const GameRoom = ({
  searchParams
}: {
  searchParams: {
    roomCode: string;
  };
}) => {
  const router = useRouter();
  const [users, setUsers] = useState<{ username: string; isHost: boolean; readyStatus: boolean; roundLoaded: boolean }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const roomCode = searchParams.roomCode;
  const [isHost, setIsHost] = useState<boolean>(false);
  const [readyStatus, setReadyStatus] = useState<boolean>(false);
  const [allReady, setAllReady] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('CELEBRITIES');
  const [selectedCyborg, setSelectedCyborg] = useState<string>('1');
  const [selectedTime, setSelectedTime] = useState<string>('4 min');
  const isNavigatingRef = useRef(false);

  const selectedValuesRef = useRef({ selectedCategory, selectedCyborg, selectedTime });

  useEffect(() => {
    selectedValuesRef.current = { selectedCategory, selectedCyborg, selectedTime };
  }, [selectedCategory, selectedCyborg, selectedTime]);

  const handleReady = (roomCode: String, userId: string) => {
    setReadyStatus(!readyStatus);
    console.log('handle ready function ', roomCode, userId)
    socket.emit('update-ready', roomCode, userId, (usersInRoom: any) => {
      setUsers(usersInRoom);
    });
  };

  const countReady = () => {
    let count = 0;
    users.forEach((user) => {
      if (user.readyStatus) {
        count++;
      }
    });
    return count;
  }

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    console.log('Selected category:', value);
  };

  const handleCyborgSelect = (value: string) => {
    setSelectedCyborg(value);
    console.log('Selected cyborg:', value);
  };

  const handleTimeSelect = (value: string) => {
    setSelectedTime(value);
    console.log('CURR VALUES', {
      roomCode,
      selectedCategory,
      selectedCyborg,
      selectedTime
    });
    console.log('Selected time:', value);
  };

  useEffect(() => {
    console.log('Updated state:', { selectedCategory, selectedCyborg, selectedTime });
  }, [selectedCategory, selectedCyborg, selectedTime]);

  // Listen for updates to the room's user list
  const handleUpdateRoom = (usersInRoom: any) => {
    setUsers(usersInRoom);
  };

  const handleGameStart = () => {
    console.log('Navigating with:', {
      roomCode,
      ...selectedValuesRef.current
    });
    isNavigatingRef.current = true;
    router.push(`/keyword/round?roomCode=${roomCode}&category=${selectedValuesRef.current.selectedCategory}&cyborg=${selectedValuesRef.current.selectedCyborg}&time=${selectedValuesRef.current.selectedTime}`);
    // router.push(`/keyword/round?roomCode=${roomCode}`);
  }

  const findNewHost = () => {
    console.log(users);
    for (let user of users) {
      console.log(`${user.username}`);
      if (!user.isHost) {
        console.log(`${user.username} is now the host`);
        user.isHost = true;
        socket.emit("update-room", users);
        break;
      }
    }
  }

  useEffect(() => {
    // Fetch username and userId from localStorage
    const isHost = localStorage.getItem('isHost') === 'true' ? true : false;
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');
    const storedReadyStatus = localStorage.getItem('readyStatus') === 'true' ? true : false;
    console.log('storeUserId is ', storedUserId)
    setUsername(storedUsername);
    setUserId(storedUserId);
    setIsHost(isHost);
    setReadyStatus(storedReadyStatus);
  }, []);

  useEffect(() => {
    if (countReady() === users.length) {
      setAllReady(true);
    } else {
      setAllReady(false);
    }
  }, [users]);

  useEffect(() => {
    if (roomCode && username && userId) {
      if (isHost) {
        socket.emit("check-room-exist", roomCode, (returnMessage: any) => {
          if (returnMessage.error) {
            // if there is no existing room then create it.
            socket.emit('create-room', username, userId, roomCode);
          }
        });
      } else {
        socket.emit("check-room-exist", roomCode, (returnMessage: any) => {
          if (returnMessage.error && !isHost) {
            alert(returnMessage.error);
            window.history.back();
            return;
          } else {
            // TODO: prompt user for username
            console.log("prompt user for username.")
          }
        });
      }

      socket?.emit('join-room', roomCode, username, userId, (usersInRoom: any) => {
        if (usersInRoom.error) {
          alert(usersInRoom.error);
          return;
        }
        setUsers(usersInRoom);
      });


      socket.on('update-room', handleUpdateRoom);


      socket.on('game-start', handleGameStart)

      return () => {
        if (!isNavigatingRef.current) {
          socket.emit('leave-room', roomCode, userId);
        }
        // if (isHost) {
        //   console.log("HELLO");
        //   findNewHost();
        // }
        socket.off('game-start', handleGameStart);
        socket.off('update-room', handleUpdateRoom);
      };
    }
  }, [roomCode, username, userId]);

  const signalAllReady = () => {
    // router.push(`/keyword/round?roomCode=${roomCode}`);
    if (allReady) {
      isNavigatingRef.current = true;
      socket.emit('all-ready', roomCode, userId);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      alert(`Room code copied: ${roomCode}`);
    }).catch((err) => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <>
      <div className="\backgroundDiv bg-robot bg-cover h-screen bg-center-left-px">
        <div className="contentContainer text-center w-[500px] mx-auto backdrop-blur-sm">
          <h1 className='text-white'>Welcome to the Game Room</h1>
          <p className='text-white'>CODE: {roomCode}</p>
          <RedButton
            label='COPY CODE'
            onClick={handleCopy}
          />
          {isHost && <CategoryDropDown onSelect={handleCategorySelect} />}
          {isHost && <CyborgDropDown onSelect={handleCyborgSelect} />}
          {isHost && <TimeDropDown onSelect={handleTimeSelect} />}
          <PlayerBoard users={users} />
          <RedButton
            onClick={() => { userId && handleReady(roomCode, userId) }}
            label={readyStatus ? 'UNREADY' : 'READY'}
          />
          {isHost && <StartButton label='START GAME' allReady={allReady} onClick={signalAllReady} />}
        </div>
      </div>
    </>
  );
};

export default GameRoom;
