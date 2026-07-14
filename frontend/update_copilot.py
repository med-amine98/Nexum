import re

def update_copilot_css():
    file_path = r"C:\Users\salah\Desktop\mon-erp\frontend\src\components\Copilot\Copilot.css"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Assistant popup
    content = re.sub(
        r"\.assistant-popup\s*\{[^}]*\}",
        """.assistant-popup {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.4);
}""",
        content
    )

    # Glow
    content = re.sub(
        r"background:\s*radial-gradient\([^)]+\);",
        "background: radial-gradient(circle at 30% 30%, rgba(37, 99, 235, 0.8), rgba(16, 185, 129, 0.6), rgba(71, 85, 105, 0.4));",
        content,
        count=1
    )

    # Icon container
    content = re.sub(
        r"background:\s*linear-gradient\([^)]+\);(?=\s*display:\s*flex)",
        "background: linear-gradient(135deg, #2563eb, #10b981);",
        content
    )
    content = re.sub(
        r"box-shadow:\s*0 10px 30px rgba\(65, 88, 208, 0\.5\);",
        "box-shadow: 0 10px 30px rgba(37, 99, 235, 0.5);",
        content
    )
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Copilot.css updated")

def update_copilot_js():
    file_path = r"C:\Users\salah\Desktop\mon-erp\frontend\src\components\Copilot\CopilotBubble.js"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Popup box styles
    content = content.replace("background: 'white'", "background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)'")
    
    # Chat area background
    content = content.replace("background: '#f8fafc'", "background: 'transparent'")
    
    # Message bubble styles
    content = content.replace("msg.type === 'user' ? config.color : msg.isFromCopilot ? '#ff6b9d20' : msg.isTeachingFeedback ? `${config.color}10` : '#ffffff'", 
                              "msg.type === 'user' ? config.color : msg.isFromCopilot ? 'rgba(37, 99, 235, 0.15)' : msg.isTeachingFeedback ? `${config.color}20` : 'rgba(30, 41, 59, 0.6)'")
    
    content = content.replace("color: msg.type === 'user' ? 'white' : '#000000'", 
                              "color: msg.type === 'user' ? '#ffffff' : '#f8fafc', backdropFilter: msg.type === 'user' ? 'none' : 'blur(10px)', border: msg.type === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)'")
    
    content = content.replace("color: msg.type === 'user' ? '#fff' : '#000000'", 
                              "color: msg.type === 'user' ? '#ffffff' : '#f8fafc', backdropFilter: msg.type === 'user' ? 'none' : 'blur(10px)', border: msg.type === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)'")

    content = content.replace("background: msg.type === 'user' ? copilotConfig.color : '#fff'", 
                              "background: msg.type === 'user' ? copilotConfig.color : 'rgba(30, 41, 59, 0.6)'")
                              
    # Texts in chat
    content = content.replace("color: '#000000'", "color: '#f8fafc'")
    
    # Input area
    content = content.replace("background: '#fff7e6'", "background: 'rgba(255, 204, 0, 0.1)'")
    content = content.replace("color: '#333'", "color: '#f8fafc'")
    content = content.replace("borderTop: `1px solid ${config.color}30`", "borderTop: '1px solid rgba(255,255,255,0.1)'")
    content = content.replace("borderTop: '1px solid #e8e8e8'", "borderTop: '1px solid rgba(255,255,255,0.1)'")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CopilotBubble.js updated")

if __name__ == '__main__':
    update_copilot_css()
    update_copilot_js()
