/**
 * Profile image field (ui-ngx tb-gallery-image-input minimal port): a
 * picture-card Upload that intercepts the file locally, converts it to a
 * base64 data URL and stores that string as the form value — the TB
 * `image` wire shape. No server round-trip on select; the profile save
 * carries the data URL.
 */
import { PlusOutlined } from '@ant-design/icons';
import { Upload, type UploadFile } from 'antd';
import { useEffect, useState } from 'react';

export function ImageField({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
}) {
  const [fileList, setFileList] = useState<Array<UploadFile>>(() =>
    value ? [toFile(value)] : [],
  );

  // Re-sync when the value changes from outside (form reset after save).
  useEffect(() => {
    setFileList(value ? [toFile(value)] : []);
  }, [value]);

  return (
    <Upload
      listType="picture-card"
      maxCount={1}
      fileList={fileList}
      disabled={disabled}
      accept="image/*"
      beforeUpload={(file) => {
        const reader = new FileReader();
        reader.onload = () => onChange?.(reader.result as string);
        reader.readAsDataURL(file);
        // Never hand the file to a server upload.
        return false;
      }}
      onRemove={() => onChange?.(undefined)}
    >
      {value ? null : <PlusOutlined />}
    </Upload>
  );
}

function toFile(dataUrl: string): UploadFile {
  return {
    uid: '-1',
    name: 'image',
    status: 'done',
    url: dataUrl,
    thumbUrl: dataUrl,
  };
}
