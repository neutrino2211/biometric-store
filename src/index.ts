import "@webcomponents/webcomponentsjs/custom-elements-es5-adapter";

import { FunctionalWidget, statefulFunctionWidget, StatefulWidget, useComponent } from "widgetsjs";
import { NativeBiometric } from "capacitor-native-biometric";
import { Clipboard } from "@capacitor/clipboard";
import { HmacSHA256, enc } from "crypto-js";

const SERVER_URL = "com.reverse.key";

const hashToPassword = (hash: string) => {
    let res = "";

    for (let i = 0; i < hash.length; i += 2) {
        let code = 0x30 + (parseInt(hash[i] + hash[i + 1], 16) % 74)

        if (code < 0x40 && code > 0x39) {
            code = 0x30 + (code % 9)
        }
        res += String.fromCharCode(code).replace('`', '0')
    }

    return res;
}

class HomePageClass extends StatefulWidget {
    constructor() {
        super({});
    }

    async onMount(): Promise<void> {
        const self = this;

        const r = await NativeBiometric.isAvailable();

        const genPassBtn = this.$child<HTMLButtonElement>("button.pass");
        const copyPassBtn = this.$child<HTMLButtonElement>("button.copy");
        const input = this.$child<HTMLInputElement>("input");


        genPassBtn.addEventListener("click", async () => {
            const verified = await NativeBiometric.verifyIdentity({
                reason: "Unlock Data"
            }).then(() => true)
            .catch(() => false);

            let _key = "";
    
            if (verified) {
                const key = await NativeBiometric.getCredentials({server: SERVER_URL}).catch(() => ({password: ""}));
                
                if (!key.password) {
                    _key = Array.from(Array(256)).map(() => String.fromCharCode(Math.round(Math.random() * 0xfe))).join('');
                    await NativeBiometric.setCredentials({
                        password: _key,
                        username: "",
                        server: SERVER_URL
                    });
                    
                } else {
                    _key = key.password;
                }

                const res = HmacSHA256(this.state.data.trim(), _key).toString();
                alert(res)
                const pass = hashToPassword(res);
                
                this.setState({
                    encrypted: pass,
                    key: _key
                })
            }
        });

        copyPassBtn.addEventListener('click', () => {
            Clipboard.write({
                string: this.state.encrypted
            })
        })

        input.addEventListener("change", function () {
            self.setState({data: this.value});
        })
        

        this.setState({biometricAvailable: r});
    }

    render (state) {
        return `
        <h3>SHA256 BASED MULTI FACTOR PASSWORD GENERATING SYSTEM</h3>
    
        <p>Welcome, kindly input the unique identifier (Sitename, App Name or URL) below</p>
    
        <div>
            <input type="text"/>
            <button class="active pass">Generate Password</button>
        </div>

        <h5>Results</h5>
    
        <p>Biometric Hardware Available: ${Boolean(state.biometricAvailable) ? "Yes" : "No"}</p>
        <p>Website: ${state.data || ""}</p>
        <p>Your Password: ${state.encrypted || ""}</p>
        <button ${state.encrypted ? 'class="active copy"' : 'class="copy"'}>Copy</button>
    `
    } 
}

useComponent(HomePageClass).as("x-home");
