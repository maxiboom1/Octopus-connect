class ItemsHashmap {
    constructor() {
        this.items = new Set();
    }
    registerItem(uid) {

        this.items.add(Number(uid));
    }
    removeItem(uid) {
        this.items.delete(uid);
        return;
    }
    isUsed(uid) {
        return this.items.has(uid);
    }
    list(){
        let list = "";
        for (const item of this.items) {list += item + ", ";}
        return list;
    }
}
const itemsHash = new ItemsHashmap();
export default itemsHash;
