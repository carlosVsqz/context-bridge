package dev.contextbridge.web;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException e) { return ResponseEntity.status(e.status).body(Map.of("code",e.code,"message",e.getMessage())); }
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate() { return ResponseEntity.status(409).body(Map.of("code","DUPLICATE","message","Ya existe un registro con ese identificador.")); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class,
        HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> validation(Exception e) {
        String message="Revisa los datos enviados.";
        if(e instanceof MethodArgumentNotValidException v && v.getBindingResult().getFieldError()!=null)
            message=v.getBindingResult().getFieldError().getField()+": "+v.getBindingResult().getFieldError().getDefaultMessage();
        return ResponseEntity.badRequest().body(Map.of("code","VALIDATION_ERROR","message",message));
    }
}
