import React from "react";

// 全局错误边界:子树渲染抛错时显示【醒目、可读】的错误卡片而非白屏。
// 深色高对比卡片 + 错误信息 + 堆栈,方便直接看到根因并重试。
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, msg: "", stack: ""};
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            msg: (error && error.message) || String(error),
            stack: (error && error.stack) ? String(error.stack).split("\n").slice(0, 6).join("\n") : "",
        };
    }

    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{padding: "32px"}}>
                    <div style={{
                        maxWidth: 720, margin: "0 auto", background: "#1f2233", color: "#f0f0f5",
                        border: "1px solid #d73e36", borderRadius: 10, padding: "24px 28px",
                    }}>
                        <div style={{fontSize: 18, fontWeight: "bold", color: "#ff6b63", marginBottom: 10}}>
                            ⚠ 页面渲染出错
                        </div>
                        <div style={{fontSize: 14, marginBottom: 12, wordBreak: "break-word"}}>
                            {this.state.msg}
                        </div>
                        {this.state.stack &&
                            <pre style={{
                                fontSize: 11, background: "#12141f", color: "#9aa0b5", padding: 12,
                                borderRadius: 6, overflowX: "auto", marginBottom: 16, whiteSpace: "pre-wrap",
                            }}>{this.state.stack}</pre>}
                        <div>
                            <button className="btn btn-primary btn-sm px-4"
                                    onClick={() => this.setState({hasError: false, msg: "", stack: ""})}>重试</button>
                            <button className="btn btn-outline-light btn-sm px-4 ms-2"
                                    onClick={() => window.location.reload()}>刷新页面</button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
