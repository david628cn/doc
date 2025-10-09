import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { listProject } from '@/api';
import { runTasks } from '@/components/Upload/tasksPools';
import { upload, UploadFile } from '@/components/Upload/upload';
import { ColorPanel, ColorPicker } from '@/components/ColorPicker';

const uploadFile = UploadFile();

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [file, setFile] = useState<any>();
    // const [value, setValue] = useState<any>('linear-gradient(0deg, #000, transparent)');
    // const [value, setValue] = useState<any>('#009688');
    const [value, setValue] = useState<any>('radial-gradient(at center center, rgba(4, 96, 255, 0.97) 0%, rgb(242, 9, 9) 19.6721%, rgb(14, 102, 218) 34.0164%, rgb(93, 0, 15) 46.3115%, rgb(239, 167, 41) 72.9508%, rgb(74, 20, 140) 100%)');
    const [value1, setValue1] = useState<any>('linear-gradient(0deg, #000, transparent)');
    
    const [image, setImage] = useState('');

    // const init = async () => {
    //     let tasks = [];
    //     for (let i = 0; i < 100; i++) {
    //         tasks.push({
    //             task: () => listProject({
    //                 pageNum: 1,
    //                 pageSize: 10
    //             })
    //         });
    //     }
    //     // const rs = await runTasks(tasks, {
    //     //     limit: 5,
    //     //     onProgress: (params: any) => {
    //     //         console.log('完成', params);
    //     //     }
    //     // });
    //     // console.log('rs', rs);
    // }

    // useEffect(() => {
    //     init();
    // }, []);
    
    return (
        <div>
            <div style={{
                padding: '20px'
            }}>
                <input type="file" onChange={ (e: any) => {
                    console.log('e.target.value', e.target.files);
                    setFile(e.target.files);
                } }/>
                <Button onClick={ async (e: any) => {
                    const fr = new FormData();
                    fr.set('file', file[0]);
                    const result: any = await uploadFile.upload({
                        type: 'chunks',
                        // checkFile: () => {

                        // },
                        // merge: () => {

                        // },
                        // onCheckChunks: () => {

                        // },
                        url: 'http://127.0.0.1:8000/api/files/uploadChunks',
                        headers: {
                            'Authorization': localStorage.getItem('token') || ''
                        },
                        file: file[0],
                        // data: fr,
                        onProgress: (event: any) => {
                            console.log('onProgress>>>', event);
                        }
                    });
                    // const { code, data } = result;
                    // setImage(data.url);
                } }>Upload</Button>
                <div>
                    <img src={ image } style={{ width: '200px' }}/>
                </div>
            </div>

            <div style={{
                padding: '20px'
            }}>
                <input type="file" onChange={ (e: any) => {
                    console.log('e.target.value', e.target.files);
                    setFile(e.target.files);
                } }/>
                <Button onClick={ async (e: any) => {
                    const fr = new FormData();
                    fr.set('file', file[0]);
                    const result: any = await uploadFile.upload({
                        url: 'http://127.0.0.1:8000/api/files/upload',
                        headers: {
                            'Authorization': localStorage.getItem('token') || ''
                        },
                        data: fr,
                        onProgress: (event: any) => {
                            console.log('onProgress>>>', event);
                            // uploadFile.cancel();
                        }
                    });
                    // const { code, data } = JSON.parse(result);
                    // setImage(data.url);
                } }>Upload</Button>
                <div>
                    <img src={ image } style={{ width: '200px' }}/>
                </div>
            </div>
            
            <div style={{
                padding: '50px 50px 50px 50px'
            }}>
                <div style={{
                    padding: '0 0 20px 0'
                }}>
                    <div style={{
                        width: '255px',
                        height: '100px',
                        borderRadius: '4px',
                        background: `${ value }`
                    }}>

                    </div>
                    <button onClick={() => {
                        setValue('radial-gradient(at center center, rgba(4, 96, 255, 0.97) 0%, rgb(242, 9, 9) 19.6721%, rgb(14, 102, 218) 34.0164%, rgb(93, 0, 15) 46.3115%, rgb(239, 167, 41) 72.9508%, rgb(74, 20, 140) 100%)');
                    }}>Update</button>
                </div>
                <ColorPicker
                    value={ value }
                    // value={ value }
                    onChange={ (v: any, json: any) => {
                        console.log('json', json);
                        setValue(v);
                    } }
                />
            </div>
            {/* <div style={{
                padding: '50px'
            }}>
                <div style={{
                    padding: '0 0 20px 0'
                }}>
                    <div style={{
                        width: '255px',
                        height: '100px',
                        borderRadius: '4px',
                        background: `${ value }`
                    }}>

                    </div>
                    <button onClick={() => {
                        setValue('radial-gradient(at center center, rgba(4, 96, 255, 0.97) 0%, rgb(242, 9, 9) 19.6721%, rgb(14, 102, 218) 34.0164%, rgb(93, 0, 15) 46.3115%, rgb(239, 167, 41) 72.9508%, rgb(74, 20, 140) 100%)');
                    }}>Update</button>
                </div>
                <ColorPanel
                    value={ value }
                    // value={ value }
                    onChange={ (v: any, json: any) => {
                        console.log('json', json);
                        setValue(v);
                    } }
                />
            </div> */}
        </div>
    );
}

export default Page;