import * as app_po from "./app.po"
// @ponicode
describe("navigateTo", () => {
    let inst: any

    beforeEach(() => {
        inst = new app_po.AppPage()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.navigateTo()
        }
    
        expect(callFunction).not.toThrow()
    })
})
