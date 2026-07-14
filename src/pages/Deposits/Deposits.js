import React, {useEffect, useState} from "react";
import axios from "axios";
import Loading from "../../components/Loading";

// 后台审核充值:①存款设置(每币地址/网络/开关/最小额/上传二维码图) ②审核队列(批准调金库入账/拒绝)。
// 直连薄服务 /depo/*(axios baseURL + Bearer 由全局拦截器自动带上)。
const NETWORKS = ["", "TRC20", "ERC20", "BEP20", "Polygon", "Solana", "Arbitrum", "Optimism", "BTC", "Lightning"];
const fileToDataUrl = (file, cb) => { if (!file) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file); };

const Deposits = () => {
    const [methods, setMethods] = useState(null);
    const [requests, setRequests] = useState(null);
    const [reqStatus, setReqStatus] = useState("PENDING");
    const [add, setAdd] = useState({currency: "USDT", network: "", address: "", minAmount: 0, enabled: true, note: "", qrImage: ""});
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    const loadMethods = () => axios.get("/depo/admin/methods").then(r => setMethods(r.data)).catch(e => setMsg("加载存款设置失败: " + e));
    const loadRequests = (s) => { setRequests(null); axios.get("/depo/admin/requests?status=" + s).then(r => setRequests(r.data)).catch(e => setMsg("加载申请失败: " + e)); };

    useEffect(() => { loadMethods(); }, []);
    useEffect(() => { loadRequests(reqStatus); }, [reqStatus]);

    const editMethod = (i, k, v) => setMethods(ms => ms.map((m, idx) => idx === i ? {...m, [k]: v} : m));
    const saveMethod = (m) => {
        setBusy(true);
        axios.put("/depo/admin/methods", {id: m.id, currency: m.currency, network: m.network || "", address: m.address || "", enabled: !!m.enabled, minAmount: Number(m.minAmount) || 0, note: m.note || "", qrImage: m.qrImage || ""})
            .then(() => { setMsg("已保存 " + m.currency + (m.network ? "-" + m.network : "")); loadMethods(); })
            .catch(e => setMsg("保存失败: " + e)).finally(() => setBusy(false));
    };
    const deleteMethod = (m) => {
        if (!window.confirm("删除该存款设置行?")) return;
        setBusy(true);
        axios.delete("/depo/admin/methods/" + m.id)
            .then(() => { setMsg("已删除"); loadMethods(); })
            .catch(e => setMsg("删除失败: " + e)).finally(() => setBusy(false));
    };
    const addMethod = () => {
        if (!add.address) { setMsg("请填写收款地址"); return; }
        saveMethod(add);
        setAdd({currency: "USDT", network: "", address: "", minAmount: 0, enabled: true, note: "", qrImage: ""});
    };
    const approve = (id) => {
        if (!window.confirm("确认批准并从金库入账?此操作会给用户实际到账。")) return;
        setBusy(true);
        axios.post(`/depo/admin/requests/${id}/approve`)
            .then(() => { setMsg("#" + id + " 已批准入账"); loadRequests(reqStatus); })
            .catch(e => setMsg("批准失败: " + (e?.response?.data?.detail || e?.response?.data?.error || e))).finally(() => setBusy(false));
    };
    const reject = (id) => {
        const reason = window.prompt("拒绝原因(可选):") || "";
        setBusy(true);
        axios.post(`/depo/admin/requests/${id}/reject`, {reason})
            .then(() => { setMsg("#" + id + " 已拒绝"); loadRequests(reqStatus); })
            .catch(e => setMsg("拒绝失败: " + e)).finally(() => setBusy(false));
    };

    return <div style={{height: "100%", overflowY: "auto"}}>
        <div className="col-12 d-flex flex-column px-5 py-4">
            {msg && <div className="alert alert-info py-2">{msg}</div>}

            {/* ===== ① 存款设置 ===== */}
            <h4 className="pb-2">存款设置(收款地址 / 开关)</h4>
            <table className="table table-bordered text-center col-12 striped">
                <thead>
                <tr><th>币种</th><th>网络</th><th>收款地址</th><th>二维码</th><th>最小额</th><th>开启</th><th>备注</th><th>操作</th></tr>
                </thead>
                <tbody>
                {methods === null ? <tr><td colSpan="8" className="py-4"><Loading/></td></tr> :
                    methods.map((m, i) => <tr key={i}>
                        <td>{m.currency}</td>
                        <td><select className="form-control form-control-sm" value={m.network || ""} onChange={e => editMethod(i, "network", e.target.value)}>{NETWORKS.map(n => <option key={n} value={n}>{n || "(无)"}</option>)}</select></td>
                        <td><input className="form-control form-control-sm" value={m.address || ""} placeholder="收款地址" onChange={e => editMethod(i, "address", e.target.value)}/></td>
                        <td style={{minWidth: "130px"}}>
                            {m.qrImage && <div><img src={m.qrImage} alt="qr" style={{width: "64px", height: "64px", objectFit: "contain", background: "#fff"}}/></div>}
                            <input type="file" accept="image/*" style={{fontSize: "10px", width: "120px"}} onChange={e => fileToDataUrl(e.target.files[0], (d) => editMethod(i, "qrImage", d))}/>
                            {m.qrImage && <button className="btn btn-sm btn-link text-danger p-0 d-block" onClick={() => editMethod(i, "qrImage", "")}>清除</button>}
                        </td>
                        <td><input className="form-control form-control-sm" style={{width: "90px"}} value={m.minAmount} onChange={e => editMethod(i, "minAmount", e.target.value)}/></td>
                        <td><input type="checkbox" checked={!!m.enabled} onChange={e => editMethod(i, "enabled", e.target.checked)}/></td>
                        <td><input className="form-control form-control-sm" value={m.note || ""} onChange={e => editMethod(i, "note", e.target.value)}/></td>
                        <td style={{whiteSpace: "nowrap"}}>
                            <button className="btn btn-sm btn-primary me-2" disabled={busy} onClick={() => saveMethod(m)}>保存</button>
                            <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => deleteMethod(m)}>删除</button>
                        </td>
                    </tr>)}
                {/* 新增一行(可加多网络,如 USDT-TRC20 / USDT-ERC20) */}
                <tr>
                    <td><input className="form-control form-control-sm" value={add.currency} placeholder="币种如 USDT" onChange={e => setAdd({...add, currency: e.target.value.toUpperCase()})}/></td>
                    <td><select className="form-control form-control-sm" value={add.network} onChange={e => setAdd({...add, network: e.target.value})}>{NETWORKS.map(n => <option key={n} value={n}>{n || "(无)"}</option>)}</select></td>
                    <td><input className="form-control form-control-sm" value={add.address} placeholder="收款地址" onChange={e => setAdd({...add, address: e.target.value})}/></td>
                    <td>
                        {add.qrImage && <img src={add.qrImage} alt="qr" style={{width: "48px", height: "48px", objectFit: "contain", background: "#fff"}}/>}
                        <input type="file" accept="image/*" style={{fontSize: "10px", width: "120px"}} onChange={e => fileToDataUrl(e.target.files[0], (d) => setAdd({...add, qrImage: d}))}/>
                    </td>
                    <td><input className="form-control form-control-sm" style={{width: "90px"}} value={add.minAmount} onChange={e => setAdd({...add, minAmount: e.target.value})}/></td>
                    <td><input type="checkbox" checked={add.enabled} onChange={e => setAdd({...add, enabled: e.target.checked})}/></td>
                    <td><input className="form-control form-control-sm" value={add.note} onChange={e => setAdd({...add, note: e.target.value})}/></td>
                    <td><button className="btn btn-sm btn-success" disabled={busy} onClick={addMethod}>新增</button></td>
                </tr>
                </tbody>
            </table>

            {/* ===== ② 充值审核 ===== */}
            <h4 className="pt-4 pb-2">充值审核</h4>
            <div className="pb-2">
                {["PENDING", "APPROVED", "REJECTED"].map(s =>
                    <button key={s} className={"btn btn-sm me-2 " + (reqStatus === s ? "btn-primary" : "btn-outline-secondary")} onClick={() => setReqStatus(s)}>{s}</button>)}
            </div>
            <table className="table table-bordered text-center col-12 striped">
                <thead>
                <tr><th>#</th><th>用户</th><th>币种</th><th>网络</th><th>金额</th><th>Tx/凭证</th><th>备注</th><th>时间</th><th>操作</th></tr>
                </thead>
                <tbody>
                {requests === null ? <tr><td colSpan="9" className="py-4"><Loading/></td></tr> :
                    requests.length === 0 ? <tr><td colSpan="9" className="py-4">无 {reqStatus} 申请</td></tr> :
                        requests.map(r => <tr key={r.id}>
                            <td>{r.id}</td>
                            <td style={{fontSize: "11px"}}>{r.userUuid}</td>
                            <td>{r.currency}</td>
                            <td>{r.network}</td>
                            <td>{r.amount}</td>
                            <td style={{fontSize: "11px"}}>{r.txRef}</td>
                            <td>{r.proofNote}</td>
                            <td style={{fontSize: "11px"}}>{r.createdAt}</td>
                            <td>{reqStatus === "PENDING" ?
                                <>
                                    <button className="btn btn-sm btn-success me-2" disabled={busy} onClick={() => approve(r.id)}>批准</button>
                                    <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => reject(r.id)}>拒绝</button>
                                </> : "-"}</td>
                        </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
};

export default Deposits;
