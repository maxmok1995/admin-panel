import React, {useEffect, useState} from "react";
import axios from "axios";
import Loading from "../../components/Loading";

// 后台审核【出金】(与充值对称):①提现设置(每币/网络 开关/最小额/手续费/备注) ②审核队列(批准=确认已链下打款;拒绝=退款)。
// 直连薄服务 /wd/*(axios baseURL + Bearer 由全局拦截器自动带上)。
// 注意:用户提交提现时资金已【锁进金库】;批准仅标记完成(链下打款由管理员手动完成),拒绝会自动退款给用户。
const NETWORKS = ["", "TRC20", "ERC20", "BEP20", "Polygon", "Solana", "Arbitrum", "Optimism", "BTC", "Lightning"];

const Withdrawals = () => {
    const [methods, setMethods] = useState(null);
    const [requests, setRequests] = useState(null);
    const [reqStatus, setReqStatus] = useState("PENDING");
    const [add, setAdd] = useState({currency: "USDT", network: "", minAmount: 0, fee: 0, enabled: true, note: ""});
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    const loadMethods = () => axios.get("/wd/admin/methods").then(r => setMethods(r.data)).catch(e => setMsg("加载提现设置失败: " + e));
    const loadRequests = (s) => { setRequests(null); axios.get("/wd/admin/requests?status=" + s).then(r => setRequests(r.data)).catch(e => setMsg("加载申请失败: " + e)); };

    useEffect(() => { loadMethods(); }, []);
    useEffect(() => { loadRequests(reqStatus); }, [reqStatus]);

    const editMethod = (i, k, v) => setMethods(ms => ms.map((m, idx) => idx === i ? {...m, [k]: v} : m));
    const saveMethod = (m) => {
        setBusy(true);
        axios.put("/wd/admin/methods", {id: m.id, currency: m.currency, network: m.network || "", enabled: !!m.enabled, minAmount: Number(m.minAmount) || 0, fee: Number(m.fee) || 0, note: m.note || ""})
            .then(() => { setMsg("已保存 " + m.currency + (m.network ? "-" + m.network : "")); loadMethods(); })
            .catch(e => setMsg("保存失败: " + e)).finally(() => setBusy(false));
    };
    const deleteMethod = (m) => {
        if (!window.confirm("删除该提现设置行?")) return;
        setBusy(true);
        axios.delete("/wd/admin/methods/" + m.id)
            .then(() => { setMsg("已删除"); loadMethods(); })
            .catch(e => setMsg("删除失败: " + e)).finally(() => setBusy(false));
    };
    const addMethod = () => {
        if (!add.currency) { setMsg("请填写币种"); return; }
        saveMethod(add);
        setAdd({currency: "USDT", network: "", minAmount: 0, fee: 0, enabled: true, note: ""});
    };
    const approve = (id) => {
        if (!window.confirm("确认批准?请确保你已在链下把币打到用户的提现地址。批准只做标记(资金申请时已从用户扣至金库)。")) return;
        const txHash = window.prompt("链上 tx hash(可选,备查):") || "";
        setBusy(true);
        axios.post(`/wd/admin/requests/${id}/approve`, {txHash})
            .then(() => { setMsg("#" + id + " 已标记完成"); loadRequests(reqStatus); })
            .catch(e => setMsg("批准失败: " + (e?.response?.data?.detail || e?.response?.data?.error || e))).finally(() => setBusy(false));
    };
    const reject = (id) => {
        const reason = window.prompt("拒绝原因(可选,会自动退款给用户):") || "";
        setBusy(true);
        axios.post(`/wd/admin/requests/${id}/reject`, {reason})
            .then(() => { setMsg("#" + id + " 已拒绝并退款"); loadRequests(reqStatus); })
            .catch(e => setMsg("拒绝失败: " + (e?.response?.data?.detail || e?.response?.data?.error || e))).finally(() => setBusy(false));
    };

    return <div style={{height: "100%", overflowY: "auto"}}>
        <div className="col-12 d-flex flex-column px-5 py-4">
            {msg && <div className="alert alert-info py-2">{msg}</div>}

            {/* ===== ① 提现设置 ===== */}
            <h4 className="pb-2">提现设置(开关 / 最小额 / 手续费)</h4>
            <table className="table table-bordered text-center col-12 striped">
                <thead>
                <tr><th>币种</th><th>网络</th><th>最小额</th><th>手续费</th><th>开启</th><th>备注</th><th>操作</th></tr>
                </thead>
                <tbody>
                {methods === null ? <tr><td colSpan="7" className="py-4"><Loading/></td></tr> :
                    methods.map((m, i) => <tr key={i}>
                        <td>{m.currency}</td>
                        <td><select className="form-control form-control-sm" value={m.network || ""} onChange={e => editMethod(i, "network", e.target.value)}>{NETWORKS.map(n => <option key={n} value={n}>{n || "(无)"}</option>)}</select></td>
                        <td><input className="form-control form-control-sm" style={{width: "90px"}} value={m.minAmount} onChange={e => editMethod(i, "minAmount", e.target.value)}/></td>
                        <td><input className="form-control form-control-sm" style={{width: "90px"}} value={m.fee} onChange={e => editMethod(i, "fee", e.target.value)}/></td>
                        <td><input type="checkbox" checked={!!m.enabled} onChange={e => editMethod(i, "enabled", e.target.checked)}/></td>
                        <td><input className="form-control form-control-sm" value={m.note || ""} onChange={e => editMethod(i, "note", e.target.value)}/></td>
                        <td style={{whiteSpace: "nowrap"}}>
                            <button className="btn btn-sm btn-primary me-2" disabled={busy} onClick={() => saveMethod(m)}>保存</button>
                            <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => deleteMethod(m)}>删除</button>
                        </td>
                    </tr>)}
                <tr>
                    <td><input className="form-control form-control-sm" value={add.currency} placeholder="币种如 USDT" onChange={e => setAdd({...add, currency: e.target.value.toUpperCase()})}/></td>
                    <td><select className="form-control form-control-sm" value={add.network} onChange={e => setAdd({...add, network: e.target.value})}>{NETWORKS.map(n => <option key={n} value={n}>{n || "(无)"}</option>)}</select></td>
                    <td><input className="form-control form-control-sm" style={{width: "90px"}} value={add.minAmount} onChange={e => setAdd({...add, minAmount: e.target.value})}/></td>
                    <td><input className="form-control form-control-sm" style={{width: "90px"}} value={add.fee} onChange={e => setAdd({...add, fee: e.target.value})}/></td>
                    <td><input type="checkbox" checked={add.enabled} onChange={e => setAdd({...add, enabled: e.target.checked})}/></td>
                    <td><input className="form-control form-control-sm" value={add.note} onChange={e => setAdd({...add, note: e.target.value})}/></td>
                    <td><button className="btn btn-sm btn-success" disabled={busy} onClick={addMethod}>新增</button></td>
                </tr>
                </tbody>
            </table>

            {/* ===== ② 出金审核 ===== */}
            <h4 className="pt-4 pb-2">出金审核</h4>
            <div className="pb-2">
                {["PENDING", "APPROVED", "REJECTED"].map(s =>
                    <button key={s} className={"btn btn-sm me-2 " + (reqStatus === s ? "btn-primary" : "btn-outline-secondary")} onClick={() => setReqStatus(s)}>{s}</button>)}
            </div>
            <table className="table table-bordered text-center col-12 striped">
                <thead>
                <tr><th>#</th><th>用户</th><th>类型</th><th>币种/法币</th><th>网络/国家</th><th>提现地址 / 银行信息</th><th>金额</th><th>时间</th><th>操作</th></tr>
                </thead>
                <tbody>
                {requests === null ? <tr><td colSpan="9" className="py-4"><Loading/></td></tr> :
                    requests.length === 0 ? <tr><td colSpan="9" className="py-4">无 {reqStatus} 申请</td></tr> :
                        requests.map(r => <tr key={r.id}>
                            <td>{r.id}</td>
                            <td style={{fontSize: "11px"}}>{r.userUuid}</td>
                            <td>{r.kind === "bank" ? "银行卡" : "加密"}</td>
                            <td>{r.currency}</td>
                            <td>{r.network}</td>
                            <td style={{fontSize: "11px", wordBreak: "break-all", textAlign: "left"}}>
                                {r.kind === "bank"
                                    ? <>银行:{r.bankName}<br/>账号:{r.bankAccount}<br/>持卡人:{r.accountHolder}</>
                                    : r.address}
                            </td>
                            <td style={{fontSize: "12px"}}>
                                {r.kind === "bank"
                                    ? <>{r.fiatAmount} {r.currency}<br/><span style={{opacity: 0.7}}>扣 {r.amount} USDC<br/>(1USDC≈{r.rate})</span></>
                                    : r.amount}
                            </td>
                            <td style={{fontSize: "11px"}}>{r.createdAt}</td>
                            <td style={{whiteSpace: "nowrap"}}>{reqStatus === "PENDING" ?
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

export default Withdrawals;
