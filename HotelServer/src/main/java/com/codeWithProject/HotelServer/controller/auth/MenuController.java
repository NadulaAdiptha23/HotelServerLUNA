package com.codeWithProject.HotelServer.controller.auth;

import com.codeWithProject.HotelServer.entity.MenuItem;
import com.codeWithProject.HotelServer.enums.MenuCategory;
import com.codeWithProject.HotelServer.services.Menu.MenuService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
@CrossOrigin
public class MenuController {

    @Autowired
    private MenuService menuService;

    // CREATE (Admin)
    @PostMapping
    public MenuItem addItem(@RequestBody MenuItem item) {
        return menuService.addMenuItem(item);
    }

    // READ ALL (User)
    @GetMapping
    public List<MenuItem> getAllItems() {
        return menuService.getAllItems();
    }

    // READ BY CATEGORY
    @GetMapping("/category/{category}")
    public List<MenuItem> getByCategory(@PathVariable MenuCategory category) {
        return menuService.getByCategory(category);
    }

    // UPDATE (Admin)
    @PutMapping("/{id}")
    public MenuItem updateItem(@PathVariable Long id, @RequestBody MenuItem item) {
        return menuService.updateMenuItem(id, item);
    }

    // DELETE (Admin)
    @DeleteMapping("/{id}")
    public void deleteItem(@PathVariable Long id) {
        menuService.deleteMenuItem(id);
    }
}
