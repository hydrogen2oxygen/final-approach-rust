import {Injectable} from '@angular/core';
import {ToastrService} from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private readonly isTauri = Boolean((window as any).__TAURI_INTERNALS__);

  constructor(private toastr: ToastrService) {
  }

  save(blob: Blob, fileName: string): void {
    if (!this.isTauri) {
      this.saveWithBrowser(blob, fileName);
      return;
    }

    blob.arrayBuffer().then(buffer => {
      return import('@tauri-apps/api/core').then(({invoke}) =>
        invoke<string>('save_export_file', {
          fileName,
          bytes: Array.from(new Uint8Array(buffer))
        })
      );
    }).then(filePath => {
      this.toastr.success(`File saved to ${filePath}`);
    }).catch(error => {
      console.error(`Could not save export ${fileName}:`, error);
      this.toastr.error(`The file could not be saved: ${String(error)}`);
    });
  }

  private saveWithBrowser(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
