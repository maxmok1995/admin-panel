import React, {useEffect, useState} from "react";
import axios from "axios";
import Loading from "../../components/Loading";

// 资金库账本(treasury ledger)管理页:①三本账对账统计 ②管理员调账(加值/减值)+审批队列 ③账本明细。
// 直连薄服务 /ledger/*(axios baseURL + Bearer 由全局拦截器带上)。金额以【金库】视角带符号(正=金库流入)。
const BOOKS = ["USER", "ADMIN", "HL"];
const num = (v) => (v == null ? "0" : Number(v).toLocaleString(undefined, {maximumFractionDigits: 8}));

const Ledger = () => {
    const [stats, setStats] = useState(null);
    const [adjusts, setAdjusts] = useState(null);
    const [adjStatus, setAdjStatus] = useState("PENDING");
    const [entries, setEntries] = useState(null);
    const [filter, setFilter] = useState({book: "", currency: ""});
    const [form, setForm] = useState({userUuid: "", currency: "USDC", amount: "", direction: "ADD", reason: ""});
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    const loadStats = () => axios.get("/ledger/admin/stats").then(r => setStats(r.data)).catch(e => setMsg("加载对账失败: " + e));
    const loadAdjusts = (s) => { setAdjusts(null); axios.get("/ledger/admin/adjustments?status=" + s).then(r => setAdjusts(r.data)).catch(e => setMsg("加载调账失败: " + e)); };
    const loadEntries = () => { setEntries(null); axios.get("/ledger/admin/entries?book=" + filter.book + "&currency=" + filter.currency).then(r => setEntries(r.data)).catch(e => setMsg("加载明细失败: " + e)); };

    useEffect(() => { loadStats(); loadEntries(); }, []);
    useEffect(() => { loadAdjusts(adjStatus); }, [adjStatus]);

    const submitAdjust = () => {
        if (!form.userUuid) { setMsg("请填写用户 UUID"); return; }
        if (!(Number(form.amount) > 0)) { setMsg("请填写有效金额"); return; }
        setBusy(true);
        axios.post("/ledger/admin/adjust", {userUuid: form.userUuid.trim(), currency: form.currency.toUpperCase(), amount: Number(form.amount), direction: form.direction, reason: form.reason})
            .then(() => { setMsg("调账请求已提交,待审批"); setForm({...form, amount: "", reason: ""}); loadAdjusts(adjStatus); })
            .catch(e => setMsg("提交失败: " + (e?.response?.data?.error || e))).finally(() => setBusy(false));
    };
    const approve = (id) => {
        if (!window.confirm("确认批准该调账?会实际划转资金(加值=金库→用户,减值=用户→金库)。")) return;
        setBusy(true);
        axios.post(`/ledger/admin/adjustments/${id}/approve`)
            .then(() => { setMsg("#" + id + " 已批准执行"); loadAdjusts(adjStatus); loadStats(); loadEntries(); })
            .catch(e => setMsg("批准失败: " + (e?.response?.data?.detail || e?.response?.data?.error || e))).finally(() => setBusy(false));
    };
    const reject = (id) => {
        const reason = window.prompt("拒绝原因(可选):") || "";
        setBusy(true);
        axios.post(`/ledger/admin/adjustments/${id}/reject`, {reason})
            .then(() => { setMsg("#" + id + " 已拒绝"); loadAdjusts(adjStatus); }).catch(e => setMsg("拒绝失败: " + e)).finally(() => setBusy(false));
    };

    const bc = stats?.byCurrency || {};
    const currencies = Object.keys(bc).sort();

    return <div style={{height: "100%", overflowY: "auto"}}>
        <div className="col-12 d-flex flex-column px-5 py-4">
            {msg && <div className="alert alert-info py-2">{msg}</div>}

            {/* ===== ① 三本账对账 ===== */}
            <h4 className="pb-2">对账(三本账 · 金库视角,正=流入)</h4>
            <table className="table table-bordered text-center col-12 striped">
                <thead><tr><th>币种</th><th>USER 用户出入金</th><th>ADMIN 管理员调账</th><th>HL 出入</th><th>账本合计</th></tr></thead>
                <tbody>
                {stats === null ? <tr><td colSpan="5" className="py-4"><Loading/></td></tr> :
                    currencies.length === 0 ? <tr><td colSpan="5" className="py-3">暂无账本数据</td></tr> :
                        currencies.map(c => {
                            const total = BOOKS.reduce((s, b) => s + Number(bc[c]?.[b]?.net || 0), 0);
                            return <tr key={c}>
                                <td>{c}</td>
                                {BOOKS.map(b => <td key={b}>{bc[c]?.[b] ? num(bc[c][b].net) : "-"}</td>)}
                                <td><b>{num(total)}</b></td>
                            </tr>;
                        })}
                </tbody>
            </table>

            {/* ===== ② 管理员调账 ===== */}
            <h4 className="pt-4 pb-2">管理员调账(加值 / 减值)</h4>
            <div className="row g-2 align-items-end pb-2">
                <div className="col-auto"><label className="form-label mb-0">用户 UUID</label>
                    <input className="form-control form-control-sm" style={{width: "280px"}} value={form.userUuid} onChange={e => setForm({...form, userUuid: e.target.value})} placeholder="wallet_owner uuid"/></div>
                <div className="col-auto"><label className="form-label mb-0">币种</label>
                    <input className="form-control form-control-sm" style={{width: "90px"}} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}/></div>
                <div className="col-auto"><label className="form-label mb-0">金额</label>
                    <input className="form-control form-control-sm" style={{width: "120px"}} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}/></div>
                <div className="col-auto"><label className="form-label mb-0">方向</label>
                    <select className="form-control form-control-sm" value={form.direction} onChange={e => setForm({...form, direction: e.target.value})}>
                        <option value="ADD">加值(给用户)</option><option value="REDUCE">减值(扣用户)</option></select></div>
                <div className="col-auto"><label className="form-label mb-0">原因</label>
                    <input className="form-control form-control-sm" style={{width: "200px"}} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}/></div>
                <div className="col-auto"><button className="btn btn-sm btn-success" disabled={busy} onClick={submitAdjust}>发起调账</button></div>
            </div>
            <div className="pb-2">
                {["PENDING", "APPROVED", "REJECTED"].map(s => <button key={s} className={"btn btn-sm me-2 " + (adjStatus === s ? "btn-primary" : "btn-outline-secondary")} onClick={() => setAdjStatus(s)}>{s}</button>)}
            </div>
            <table className="table table-bordered text-center col-12 striped">
                <thead><tr><th>#</th><th>用户</th><th>币种</th><th>方向</th><th>金额</th><th>原因</th><th>发起人</th><th>时间</th><th>操作</th></tr></thead>
                <tbody>
                {adjusts === null ? <tr><td colSpan="9" className="py-4"><Loading/></td></tr> :
                    adjusts.length === 0 ? <tr><td colSpan="9" className="py-3">无 {adjStatus} 调账</td></tr> :
                        adjusts.map(a => <tr key={a.id}>
                            <td>{a.id}</td><td style={{fontSize: "11px"}}>{a.userUuid}</td><td>{a.currency}</td>
                            <td>{a.direction === "ADD" ? "加值" : "减值"}</td><td>{a.amount}</td><td>{a.reason}</td>
                            <td style={{fontSize: "11px"}}>{a.requestedBy}</td><td style={{fontSize: "11px"}}>{a.createdAt}</td>
                            <td style={{whiteSpace: "nowrap"}}>{adjStatus === "PENDING" ? <>
                                <button className="btn btn-sm btn-success me-2" disabled={busy} onClick={() => approve(a.id)}>批准</button>
                                <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => reject(a.id)}>拒绝</button></> : "-"}</td>
                        </tr>)}
                </tbody>
            </table>

            {/* ===== ③ 账本明细 ===== */}
            <h4 className="pt-4 pb-2">账本明细</h4>
            <div className="row g-2 align-items-end pb-2">
                <div className="col-auto"><select className="form-control form-control-sm" value={filter.book} onChange={e => setFilter({...filter, book: e.target.value})}>
                    <option value="">全部账本</option>{BOOKS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                <div className="col-auto"><input className="form-control form-control-sm" style={{width: "100px"}} placeholder="币种(可空)" value={filter.currency} onChange={e => setFilter({...filter, currency: e.target.value.toUpperCase()})}/></div>
                <div className="col-auto"><button className="btn btn-sm btn-primary" onClick={loadEntries}>查询</button></div>
            </div>
            <table className="table table-bordered text-center col-12 striped">
                <thead><tr><th>#</th><th>账本</th><th>币种</th><th>金额(金库视角)</th><th>用户</th><th>ref</th><th>备注</th><th>操作人</th><th>时间</th></tr></thead>
                <tbody>
                {entries === null ? <tr><td colSpan="9" className="py-4"><Loading/></td></tr> :
                    entries.length === 0 ? <tr><td colSpan="9" className="py-3">无记录</td></tr> :
                        entries.map(e => <tr key={e.id}>
                            <td>{e.id}</td><td>{e.book}</td><td>{e.currency}</td>
                            <td style={{color: Number(e.amount) >= 0 ? "var(--green,#16c784)" : "var(--red,#ea3943)"}}>{num(e.amount)}</td>
                            <td style={{fontSize: "11px"}}>{e.userUuid}</td><td style={{fontSize: "11px"}}>{e.ref}</td>
                            <td style={{fontSize: "11px"}}>{e.note}</td><td style={{fontSize: "11px"}}>{e.createdBy}</td><td style={{fontSize: "11px"}}>{e.createdAt}</td>
                        </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
};

export default Ledger;
