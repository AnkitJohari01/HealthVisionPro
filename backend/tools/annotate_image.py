"""Deprecated annotate_image module.

Image annotation and YOLO detection were removed from the project. This
module is retained as a harmless stub to avoid import errors from older
code paths. The functions here intentionally raise NotImplementedError when
called to surface the removal.
"""

def annotate_image(*_args, **_kwargs):
    raise NotImplementedError(
        "Image annotation has been removed. To add it back, reintroduce the "
        "tool and update the analyze endpoints."
    )
