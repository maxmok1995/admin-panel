import React, {useEffect, useState, useCallback} from "react";
import axios from "axios";
import Loading from "../../components/Loading";

// 管理员操作日志:哪个管理员 / 何时 / 做了什么操作 / 目标 / 明细 / IP。
// 数据来自薄服务 /depo/admin/audit(倒序)。覆盖范围:经薄服务处理的管理操作
// (存款审批、创币、等)。opex-admin 服务(KYC/用户/白名单)是黑盒,不经此服务,记不到——诚实标注。
const AuditLog = () => {
    const [rows, setRows] = useState(null);
    const [limit, setLimit] = useState(200);
    const [q, setQ] = useState("");
    const [msg, setMsg] = useState("");

    const load = useCallback(() => {
        setRows(null);
        axios.get("/depo/admin/audit?limit=" + limit)
            .then(r => setRows(Array.isArray(r.data) ? r.data : []))
            .catch(e => { setMsg("加载失败:" + (e?.response?.data?.error || e.message)); setRows([]); });
    }, [limit]);

    useEffect(() => { load(); }, [load]);

    const shown = (rows || []).filter(r => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (r.adminEmail || "").toLowerCase().includes(s)
            || (r.action || "").toLowerCase().includes(s)
            || (r.target || "").toLowerCase().includes(s);
    });

    return <div style={{height: "100%", overflowY: "auto"}}>
        <div className="col-12 d-flex flex-column px-5 py-4">
            <div className="d-flex justify-content-between align-items-center pb-2">
                <h4 className="mb-0">管理员操作日志</h4>
                <div className="d-flex align-items-center gap-2">
                    <input className="form-control form-control-sm" style={{width: 220}} placeholder="搜索 邮箱/操作/目标"
                           value={q} onChange={e => setQ(e.target.value)}/>
                    <select className="form-select form-select-sm" style={{width: 110}} value={limit}
                            onChange={e => setLimit(Number(e.target.value))}>
                        {[100, 200, 500, 1000].map(x => <option key={x} value={x}>最近 {x}</option>)}
                    </select>
                    <button className="btn btn-outline-secondary btn-sm" onClick={load}>刷新</button>
                </div>
            </div>
            <p className="text-muted mb-2" style={{fontSize: 13}}>
                覆盖经薄服务处理的管理操作(存款审批、创币等)。opex-admin 服务的 KYC/用户/白名单操作为黑盒,不在此记录。
            </p>
            {msg && <div className="alert alert-danger py-2">{msg}</div>}

            <table className="table table-bordered text-center col-12 striped" style={{fontSize: 13}}>
                <thead><tr>
                    <th style={{width: 165}}>时间</th><th>管理员</th><th>操作</th><th>目标</th><th>明细</th><th style={{width: 120}}>IP</th>
                </tr></thead>
                <tbody>
                {rows === null ? <tr><td colSpan="6" className="py-4"><Loading/></td></tr> :
                    shown.length === 0 ? <tr><td colSpan="6" className="py-3">暂无日志</td></tr> :
                        shown.map((r, i) => <tr key={i}>
                            <td>{(r.at || "").replace("T", " ").slice(0, 19)}</td>
                            <td>{r.adminEmail || "-"}</td>
                            <td><code>{r.action}</code></td>
                            <td>{r.target || "-"}</td>
                            <td style={{textAlign: "left", maxWidth: 320, wordBreak: "break-all", fontSize: 12}}>{r.detail || "-"}</td>
                            <td style={{fontSize: 12}}>{r.ip || "-"}</td>
                        </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
};

export default AuditLog;
