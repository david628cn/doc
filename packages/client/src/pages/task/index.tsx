import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { taskStart, taskStop, taskReStart } from '@/api';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [taskId, setTaskId] = useState(null);
    const handleStart = (e: any) => {
        e.preventDefault();
        taskStart().then(rs => {
            setTaskId(rs.data);
        });
    }
    const handleStop = (e: any) => {
        e.preventDefault();
        taskStop({
            id: taskId
        });
    }
    const handleReStart = (e: any) => {
        e.preventDefault();
        taskReStart();
    }
    return (
        <div>
            <Button onClick={handleStart}>启动</Button>
            <Button onClick={handleStop}>停止</Button>
            <Button onClick={handleReStart}>重启</Button>
        </div>
    );
}

export default Page;