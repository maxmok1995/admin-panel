import React, {useState} from "react";
import axios from "axios";

// 发币/铸币:创建一个平台内部新代币(写 currency 表)并把初始供应凭空铸到金库(TREASURY owner)。
// 纯内部账本币,不上链。走薄服务 /depo/admin/coin/create(JWT+super_admin 在服务内校验)。
// 铸出的供应停在金库,之后可用「账本 Ledger」页的加值把它发给用户。
const CreateCoin = () => {
    const [form, setForm] = useState({symbol: "", name: "", precision: 8, supply: ""});
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);      // {ok, text}

    const submit = () => {
        const symbol = form.symbol.trim().toUpperCase();
        if (!symbol || !/^[A-Z0-9]{1,20}$/.test(symbol)) { setMsg({ok: false, text: "符号需为字母数字、≤20 位"}); return; }
        const supply = Number(form.supply || 0);
        if (supply < 0) { setMsg({ok: false, text: "供应量不能为负"}); return; }
        if (!window.confirm(`确认创建代币 ${symbol} 并铸造初始供应 ${supply} 到金库?此操作会写入 currency 表且不可逆。`)) return;
        setBusy(true); setMsg(null);
        axios.post("/depo/admin/coin/create", {
            symbol, name: form.name.trim() || symbol,
            precision: Number(form.precision), supply,
        })
            .then(r => {
                setMsg({ok: true, text: `已创建 ${r.data.symbol}(精度 ${r.data.precision})${r.data.minted ? `,铸造 ${r.data.minted} 到金库` : "(未铸供应)"}`});
                setForm({symbol: "", name: "", precision: 8, supply: ""});
            })
            .catch(e => {
                const err = e?.response?.data?.error;
                const map = {already_exists: "该符号已存在", bad_symbol: "符号非法", bad_precision: "精度非法(0-18)", bad_supply: "供应量非法"};
                setMsg({ok: false, text: "创建失败:" + (map[err] || e?.response?.data?.message || err || e.message)});
            })
            .finally(() => setBusy(false));
    };

    return <div style={{height: "100%", overflowY: "auto"}}>
        <div className="col-12 d-flex flex-column px-5 py-4">
            <h4 className="pb-2">发币 / 铸币</h4>
            <p className="text-muted" style={{maxWidth: 720}}>
                创建一个平台内部新代币,并把初始供应凭空铸到<b>金库(TREASURY)</b>。这是内部账本币(不上链)。
                铸出的供应停在金库,可到<b>账本 Ledger</b> 页用「加值」发给用户。操作会记入管理员审计日志。
            </p>

            {msg && <div className={`alert py-2 ${msg.ok ? "alert-success" : "alert-danger"}`} style={{maxWidth: 720}}>{msg.text}</div>}

            <div className="row g-3 align-items-end pb-3" style={{maxWidth: 720}}>
                <div className="col-6">
                    <label className="form-label mb-0">符号 Symbol *</label>
                    <input className="form-control form-control-sm" value={form.symbol} maxLength={20}
                           onChange={e => setForm({...form, symbol: e.target.value.toUpperCase()})} placeholder="如 KALPA"/>
                </div>
                <div className="col-6">
                    <label className="form-label mb-0">名称 Name</label>
                    <input className="form-control form-control-sm" value={form.name}
                           onChange={e => setForm({...form, name: e.target.value})} placeholder="留空则同符号"/>
                </div>
                <div className="col-6">
                    <label className="form-label mb-0">精度 Precision(小数位)</label>
                    <input type="number" min="0" max="18" className="form-control form-control-sm" value={form.precision}
                           onChange={e => setForm({...form, precision: e.target.value})}/>
                </div>
                <div className="col-6">
                    <label className="form-label mb-0">初始供应 Supply(铸到金库,可留 0)</label>
                    <input type="number" min="0" className="form-control form-control-sm" value={form.supply}
                           onChange={e => setForm({...form, supply: e.target.value})} placeholder="0"/>
                </div>
                <div className="col-12">
                    <button className="btn btn-primary btn-sm px-4" disabled={busy} onClick={submit}>
                        {busy ? "创建中…" : "创建并铸币"}
                    </button>
                </div>
            </div>
        </div>
    </div>;
};

export default CreateCoin;
