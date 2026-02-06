const win: any = window;

let user = JSON.parse(win.localStorage.getItem('user') || '{}');
const initialState = user ? {
  user
} : {};
export default (state = initialState, action: any) => {
    switch(action.type) {
        case 'login':
            return {
                user: action.user
            };
        default :
            return state;
    }
}
