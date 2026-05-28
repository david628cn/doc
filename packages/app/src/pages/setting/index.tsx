import { Input } from '@carvy/ui';
import './index.less';

type SettingProps = {
    className?: string;
}

const Setting: React.FC<SettingProps> = props => {
    return (
        <div className={``}>
            <Input type="text" />
        </div> 
    );
}

export default Setting;