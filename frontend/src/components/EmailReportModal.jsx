import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { motion } from 'framer-motion';
import './EmailReportModal.css'; // create accompanying CSS for glassmorphism

/**
 * EmailReportModal – Premium UI modal that lets the user compose an email report
 * and sends it via the backend `/api/v1/email/report` endpoint.
 *
 * Expected backend payload:
 *   {
 *     "to": "recipient@example.com",
 *     "subject": "Report title",
 *     "html": "<p>Report content</p>"
 *   }
 *
 * The backend uses Gmail SMTP – make sure the following env vars are set:
 *   GMAIL_USER, GMAIL_PASSWORD
 */
const EmailReportModal = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/email/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to send email');
      message.success('Report sent successfully');
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Could not send report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      title={<span style={{ color: '#fff' }}>Email Report</span>}
      footer={null}
      onCancel={onClose}
      className="premium-modal"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Form layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="to"
            label="Recipient"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          >
            <Input placeholder="example@domain.com" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Subject is required' }]}
          >
            <Input placeholder="Report subject" />
          </Form.Item>
          <Form.Item
            name="html"
            label="HTML Content"
            rules={[{ required: true, message: 'Provide email body' }]}
          >
            <Input.TextArea rows={6} placeholder="<p>Report body …</p>" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Send Report
            </Button>
          </Form.Item>
        </Form>
      </motion.div>
    </Modal>
  );
};

export default EmailReportModal;
