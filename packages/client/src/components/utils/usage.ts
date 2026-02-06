export type UsagProps = {
    limit: number;
    key: string;
}

export class Usage {
    limit: number = 10;
    key: string = 'expiring_';
    data: Array<any> = [];
    constructor(props: UsagProps) {
        this.limit = props.limit;
        this.key = props.key;
        this.data = this.load();
    }
    load() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('加载数据失败:', error);
            return [];
        }
    }
    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.data));
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
    add(item: any) {
        // if (!item || typeof item !== 'string' || item.trim() === '') {
        //     return false;
        // }
        // const trimmedItem = item.trim();
        // const index = this.data.indexOf(trimmedItem);
        // if (index > -1) {
        //     this.data.splice(index, 1);
        // }
        this.data.unshift(item);
        if (this.data.length > this.limit) {
            this.data.pop();
        }
        this.save();
        return true;
    }
    get() {
        return [...this.data];
    }
    clear() {
        this.data = [];
        this.save();
    }
    // contains(item: any) {
    //     return this.data.includes(item);
    // }
    size() {
        return this.data.length;
    }
    remove(item: any) {
        const index = this.data.indexOf(item);
        if (index > -1) {
            this.data.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }
    moveToTop(item: any) {
        const index = this.data.indexOf(item);
        if (index > -1) {
            this.data.splice(index, 1);
            this.data.unshift(item);
            this.save();
            return true;
        }
        return false;
    }
}