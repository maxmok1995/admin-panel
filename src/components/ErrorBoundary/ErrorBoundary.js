import React from "react";

// 全局错误边界:任何子树渲染抛错时,显示可恢复的提示而非整页白屏。
// 白屏根因常见:后端/网关(如 Cloudflare 挑战)返回了非预期内容(HTML 而非 JSON),
// 页面对其做 .map/.filter 抛错。这里兜住,给「重试」而不是空白。
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, msg: ""};
    }

    static getDerivedStateFromError(error) {
        return {hasError: true, msg: (error && error.message) || String(error)};
    }

    componentDidCatch(error, info) {
        // 打到控制台便于排查,不上报外部
        console.error("[ErrorBoundary]", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{padding: "40px", textAlign: "center", color: "#ddd"}}>
                    <h4 style={{marginBottom: 12}}>页面渲染出错</h4>
                    <p style={{opacity: 0.7, fontSize: 13, maxWidth: 520, margin: "0 auto 18px"}}>
                        {this.state.msg}
                    </p>
                    <button className="btn btn-primary btn-sm px-4"
                            onClick={() => this.setState({hasError: false, msg: ""})}>
                        重试
                    </button>
                    <button className="btn btn-outline-secondary btn-sm px-4 ms-2"
                            onClick={() => window.location.reload()}>
                        刷新页面
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
